import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

interface CelestialBodyProperties {
  id: number;
  name: string;
  mass: number;
  size: number;
  orbitalVelocity: {
    radial: number;
    tangential: number;
  };
  isSun?: boolean;
  isLocked?: boolean;
}

interface ExtendedBody extends Matter.Body {
  isSun?: boolean;
  circleRadius?: number;
  timeCreated?: number;
  name?: string;
  isLocked?: boolean;
  lockedVelocity?: { x: number; y: number };
}

const PhysicsSimulator: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [selectedBody, setSelectedBody] = useState<CelestialBodyProperties | null>(null);
  const [bodies, setBodies] = useState<Matter.Body[]>([]);
  const [nextBodyId, setNextBodyId] = useState(1);
  const [grabMode, setGrabMode] = useState(true);
  const [nextPlanetNumber, setNextPlanetNumber] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isHoldingPlanet, setIsHoldingPlanet] = useState(false);
  const [editingValues, setEditingValues] = useState<{
    name: string;
    mass: number;
    size: number;
    isLocked: boolean;
  } | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const grabModeRef = useRef(grabMode);

  useEffect(() => {
    grabModeRef.current = grabMode;
    if (mouseConstraintRef.current) {
      if (grabMode) {
        mouseConstraintRef.current.constraint.stiffness = 0.2;
        mouseConstraintRef.current.constraint.damping = 0.5;
      } else {
        mouseConstraintRef.current.constraint.stiffness = 0.0000001;
        mouseConstraintRef.current.constraint.damping = 0;
      }
    }
  }, [grabMode]);

  // Physics constants
  const GRAVITY_CONSTANT = 0.5;
  const SUN_MASS = 10000;
  const SUN_RADIUS = 40;
  
  const createPlanet = (distance: number = 150 + Math.random() * 150, size: number = 8 + Math.random() * 12, planetNumberOverride?: number): ExtendedBody => {
    // Use override if provided (for initial planets), otherwise use state
    const planetNumber = planetNumberOverride ?? nextPlanetNumber;
    if (planetNumberOverride === undefined) {
      setNextPlanetNumber(prev => prev + 1);
    }

    const angle = Math.random() * Math.PI * 2;
    const x = 400 + Math.cos(angle) * distance;
    const y = 400 + Math.sin(angle) * distance;
    
    // v = sqrt(GM/r) where G is gravitational constant, M is sun's mass, r is distance
    const orbitSpeed = Math.sqrt((GRAVITY_CONSTANT * SUN_MASS) / distance);

    // Positive for counterclockwise orbit (standard in math/physics)
    const vx = Math.sin(angle) * orbitSpeed * 1.5;
    const vy = -Math.cos(angle) * orbitSpeed * 1.5;
    
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    
    const planet = Matter.Bodies.circle(x, y, size, {
      render: {
        fillStyle: color,
        strokeStyle: '#FFFFFF'
      },
      mass: size * 2, // Initial mass based on size, but will be independent after creation
      velocity: { x: vx, y: vy },
      frictionAir: 0,
      friction: 0,
      plugin: { isSun: false }
    }) as ExtendedBody;
    
    planet.isSun = false;
    planet.circleRadius = size;
    planet.name = `Planet ${planetNumber}`;
    planet.id = planetNumber;
    return planet;
  };

  const calculateOrbitalVelocity = (body: Matter.Body, sun: Matter.Body) => {
    const dx = body.position.x - sun.position.x;
    const dy = body.position.y - sun.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const radialX = dx / distance;
    const radialY = dy / distance;

    const radialVelocity = body.velocity.x * radialX + body.velocity.y * radialY;

    const tangentialVelocity = body.velocity.x * (-radialY) + body.velocity.y * radialX;
    
    return {
      radial: radialVelocity,
      tangential: tangentialVelocity
    };
  };

  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 }
    });

    engine.timing.timeScale = 0.5;  // 50% speed

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 800,
        wireframes: false,
        background: '#000000'
      }
    });

    // Create the sun at the center
    const sun = Matter.Bodies.circle(400, 400, SUN_RADIUS, {
      isStatic: true,
      render: {
        fillStyle: '#FFD700',
        strokeStyle: '#FFA500'
      },
      mass: SUN_MASS,
      id: 0,
      plugin: { isSun: true }
    }) as ExtendedBody;
    sun.isSun = true;

    // Use a local variable to assign unique numbers to the initial planets
    let initialPlanetNumber = 1;
    const planets: ExtendedBody[] = [
      createPlanet(100, 10, initialPlanetNumber++),
      createPlanet(150, 15, initialPlanetNumber++),
      createPlanet(200, 16, initialPlanetNumber++),
      createPlanet(250, 12, initialPlanetNumber++),
    ];
    // Set the next planet number for user-created planets
    setNextPlanetNumber(initialPlanetNumber);

    setBodies([...planets]);
    setNextBodyId(nextBodyId + 4);

    Matter.Events.on(engine, 'beforeUpdate', () => {
      const allBodies = Matter.Composite.allBodies(engine.world) as ExtendedBody[];
      const sun = allBodies.find(body => body.isSun);
      if (!sun) return;

      // Update gravitational forces
      allBodies.forEach(body => {
        if (body === sun) return;
        if ((body as ExtendedBody).isLocked) return; // Skip locked planets

        const dx = sun.position.x - body.position.x;
        const dy = sun.position.y - body.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const force = (GRAVITY_CONSTANT * sun.mass * body.mass) / (distance * distance);
        const angle = Math.atan2(dy, dx);
        
        const currentVx = body.velocity.x;
        const currentVy = body.velocity.y;
        
        const acceleration = force / body.mass;
        const accelerationX = Math.cos(angle) * acceleration;
        const accelerationY = Math.sin(angle) * acceleration;
        
        Matter.Body.setVelocity(body, {
          x: currentVx + accelerationX,
          y: currentVy + accelerationY
        });
      });

      // Update selectedBody when hovering over a planet in grab mode
      if (isMouseDown && mouseConstraintRef.current?.mouse.position) {
        const mousePosition = mouseConstraintRef.current.mouse.position;
        const bodiesAtPoint = Matter.Query.point(allBodies.filter(b => !b.isSensor), mousePosition);
        const bodyUnderMouse = bodiesAtPoint[0] as ExtendedBody;

        if (bodyUnderMouse && !bodyUnderMouse.isSun && (!selectedBody || selectedBody.id !== bodyUnderMouse.id)) {
          const orbitalVelocity = calculateOrbitalVelocity(bodyUnderMouse, sun);
          setSelectedBody({
            id: bodyUnderMouse.id,
            name: bodyUnderMouse.name || 'Unknown',
            mass: bodyUnderMouse.mass,
            size: bodyUnderMouse.circleRadius! * 2,
            orbitalVelocity,
            isSun: bodyUnderMouse.isSun
          });
        }
      }



      if (!grabMode && mouseConstraintRef.current) {
        mouseConstraintRef.current.collisionFilter.mask = 0x00000000;
      }
    });

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA as ExtendedBody;
        const bodyB = pair.bodyB as ExtendedBody;
        
        if ((bodyA.isSun || bodyB.isSun) && !(bodyA.isSun && bodyB.isSun)) {
          const planet = bodyA.isSun ? bodyB : bodyA;
          Matter.World.remove(engine.world, planet);
          setBodies(prevBodies => prevBodies.filter(b => b.id !== planet.id));
          
          if (selectedBody && selectedBody.id === planet.id) {
            setSelectedBody(null);
          }
        }
      });
    });

    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: grabMode ? 0.2 : 0.0000001,
        render: { visible: false },
        damping: grabMode ? 0.5 : 0
      },
      // Add collisionFilter to prevent grabbing in view mode
      collisionFilter: {
        mask: grabMode ? 0xFFFFFFFF : 0x00000000
      }
    });


    let isMouseDown = false;
    render.canvas.addEventListener('mousedown', () => { 
      isMouseDown = true; 
      // If in grab mode and a planet is selected, set isHoldingPlanet true
      if (grabMode && selectedBody) setIsHoldingPlanet(true);
    });
    render.canvas.addEventListener('mouseup', () => { 
      isMouseDown = false; 
      setIsHoldingPlanet(false);
    });


    Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
      const mousePosition = event.mouse.position;
      const allBodies = Matter.Composite.allBodies(engine.world) as ExtendedBody[];
      const sun = allBodies.find(body => body.isSun);
      const bodiesAtPoint = Matter.Query.point(allBodies.filter(b => !b.isSensor), mousePosition);
      const clickedBody = bodiesAtPoint[0] as ExtendedBody;

      if (clickedBody && sun) {
        const orbitalVelocity = calculateOrbitalVelocity(clickedBody, sun);
        setSelectedBody({
          id: clickedBody.id,
          name: clickedBody.name || 'Unknown',
          mass: clickedBody.mass,
          size: clickedBody.circleRadius! * 2,
          orbitalVelocity,
          isSun: clickedBody.isSun
        });

        if (!grabMode || clickedBody.isSun) {
          mouseConstraint.collisionFilter.mask = 0x00000000;
        } else {
          mouseConstraint.collisionFilter.mask = 0xFFFFFFFF;
        }
      } else {
        setSelectedBody(null);
      }
    });

    Matter.Composite.add(engine.world, [sun, ...planets, mouseConstraint]);
    render.mouse = mouse;
    mouseConstraintRef.current = mouseConstraint;

    const updateMouseConstraint = () => {
      if (mouseConstraintRef.current) {
        mouseConstraintRef.current.collisionFilter.mask = grabMode ? 0xFFFFFFFF : 0x00000000;
      }
    };

    Matter.Events.on(engine, 'afterUpdate', updateMouseConstraint);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    engineRef.current = engine;
    renderRef.current = render;

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      render.canvas = null as any;
      render.context = null as any;
      render.textures = {};
    };
  }, []);

  // Separate effect to update selected body properties in real-time
  useEffect(() => {
    if (!selectedBody || !engineRef.current) return;

    const interval = setInterval(() => {
      const allBodies = Matter.Composite.allBodies(engineRef.current!.world) as ExtendedBody[];
      const sun = allBodies.find(body => body.isSun);
      if (!sun) return;

      const body = allBodies.find(b => b.id === selectedBody.id);
      if (body) {
        // Check if the body is currently being held by the mouse constraint
        const isCurrentlyHeld = !!(mouseConstraintRef.current && 
          mouseConstraintRef.current.body === body);
        
        setIsHoldingPlanet(isCurrentlyHeld);
        
        const orbitalVelocity = calculateOrbitalVelocity(body, sun);
        setSelectedBody(prev => ({
          id: body.id,
          name: (body as ExtendedBody).name || 'Unknown',
          mass: prev?.mass ?? body.mass, // Preserve manual mass changes
          size: (body as ExtendedBody).circleRadius! * 2,
          orbitalVelocity,
          isSun: (body as ExtendedBody).isSun,
          isLocked: (body as ExtendedBody).isLocked ?? false
        }));
      } else {
        // If body not found, it was deleted
        setSelectedBody(null);
        setIsHoldingPlanet(false);
      }
    }, 50); // Update every 50ms for smooth real-time updates

    return () => clearInterval(interval);
  }, [selectedBody?.id]); // Only re-run when selected body ID changes

  return (
    <div className="w-full h-800 flex items-start justify-center bg-gray-900 p-4">
      <div className="flex-1 flex flex-col items-center">
        <div 
          ref={sceneRef} 
          className="rounded-lg shadow-lg overflow-hidden"
        />
      </div>
      <div className="flex flex-col items-center">
        <div className="flex gap-4 mb-4">
            <button 
              onClick={() => engineRef.current && Matter.Composite.add(engineRef.current.world, [createPlanet()])}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Add Planet
            </button>
            <button 
              onClick={() => setGrabMode(!grabMode)}
              className={`px-4 py-2 ${grabMode ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded transition-colors`}
            >
              {grabMode ? 'Grab Mode' : 'View Mode'}
            </button>
          </div>
        <div className="w-80 ml-4 bg-gray-800 text-white rounded-lg shadow-lg p-4 sticky top-4">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Celestial Body Properties</h3>
            {!selectedBody && (
              <p className="text-sm text-gray-400 mt-2">Click on a planet to view its properties</p>
            )}
          </div>
          {selectedBody && (
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">Name</span>
                      <input
                        className="text-sm text-gray-900 bg-gray-200 rounded px-2 py-1 ml-2"
                        value={editingValues?.name ?? selectedBody.name}
                        onChange={e => {
                          if (editingValues) {
                            setEditingValues({ ...editingValues, name: e.target.value });
                            setSelectedBody({ ...selectedBody, name: e.target.value });
                            // Update Matter body
                            if (engineRef.current) {
                              const allBodies = Matter.Composite.allBodies(engineRef.current.world) as ExtendedBody[];
                              const body = allBodies.find(b => b.id === selectedBody.id);
                              if (body) body.name = e.target.value;
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {selectedBody.isSun && (
                    <div>
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">Mass</span>
                        <input
                          type="number"
                          className="text-sm text-gray-900 bg-gray-200 rounded px-2 py-1 ml-2 w-20"
                                                  value={editingValues?.mass ?? selectedBody.mass}
                        min={0.1}
                        step={0.1}
                        onChange={e => {
                          if (editingValues) {
                            const mass = parseFloat(e.target.value);
                            setEditingValues({ ...editingValues, mass });
                            setSelectedBody({ ...selectedBody, mass });
                            if (engineRef.current) {
                              const allBodies = Matter.Composite.allBodies(engineRef.current.world) as ExtendedBody[];
                              const body = allBodies.find(b => b.id === selectedBody.id);
                              if (body) {
                                Matter.Body.setMass(body, mass);
                                body.inverseMass = 1 / mass;
                              }
                            }
                          }
                        }}
                        />
                      </label>
                                        </div>
                  )}
                  {!selectedBody.isSun && (
                    <div>
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">Locked</span>
                        <input
                          type="checkbox"
                          className="ml-2"
                          checked={editingValues?.isLocked ?? selectedBody.isLocked ?? false}
                          onChange={e => {
                            if (editingValues) {
                              const isLocked = e.target.checked;
                              setEditingValues({ ...editingValues, isLocked });
                              setSelectedBody({ ...selectedBody, isLocked });
                              if (engineRef.current) {
                                const allBodies = Matter.Composite.allBodies(engineRef.current.world) as ExtendedBody[];
                                const body = allBodies.find(b => b.id === selectedBody.id);
                                if (body) {
                                  if (isLocked) {
                                    // Store current velocity before locking
                                    body.lockedVelocity = { x: body.velocity.x, y: body.velocity.y };
                                    body.isLocked = true;
                                    Matter.Body.setVelocity(body, { x: 0, y: 0 });
                                  } else {
                                    // Restore velocity when unlocking
                                    body.isLocked = false;
                                    if (body.lockedVelocity) {
                                      Matter.Body.setVelocity(body, body.lockedVelocity);
                                      body.lockedVelocity = undefined;
                                    }
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">Size</span>
                      <input
                        type="number"
                        className="text-sm text-gray-900 bg-gray-200 rounded px-2 py-1 ml-2 w-20"
                        value={editingValues?.size ?? selectedBody.size}
                        min={1}
                        step={1}
                        onChange={e => {
                          if (editingValues) {
                            const size = parseFloat(e.target.value);
                            setEditingValues({ ...editingValues, size });
                            setSelectedBody({ ...selectedBody, size });
                            if (engineRef.current) {
                              const allBodies = Matter.Composite.allBodies(engineRef.current.world) as ExtendedBody[];
                              const body = allBodies.find(b => b.id === selectedBody.id);
                              if (body) {
                                // Store the current mass before scaling
                                const currentMass = body.mass;
                                const currentInverseMass = body.inverseMass;
                                
                                // Use Matter.Body.scale to change the hitbox
                                const oldRadius = body.circleRadius || (body as any).radius || 1;
                                const newRadius = size / 2;
                                const scale = newRadius / oldRadius;
                                Matter.Body.scale(body, scale, scale);
                                body.circleRadius = newRadius;
                                
                                // Restore the mass to keep it independent of size
                                Matter.Body.setMass(body, currentMass);
                                body.inverseMass = currentInverseMass;
                              }
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded" onClick={() => {
                    setIsEditing(false);
                    setEditingValues(null);
                  }}>Done</button>
                </>
              ) : (
                [
                  { label: 'Name', value: selectedBody.name },
                  { label: 'Type', value: selectedBody.isSun ? 'Sun' : 'Planet' },
                  ...(selectedBody.isSun ? [{ label: 'Mass', value: selectedBody.mass.toFixed(2) }] : []),
                  { label: 'Size', value: `${selectedBody.size.toFixed(2)}px` },
                  ...(selectedBody.isLocked ? [{ label: 'Status', value: 'Locked', suffix: '(frozen)' }] : []),
                  { 
                    label: 'Radial Velocity',
                    value: selectedBody.isSun ? '0.00' : (isHoldingPlanet || selectedBody.isLocked ? '0.00' : selectedBody.orbitalVelocity.radial.toFixed(2)),
                    suffix: selectedBody.isSun ? '(NaN)' : (isHoldingPlanet ? '(held)' : selectedBody.isLocked ? '(locked)' : (selectedBody.orbitalVelocity.radial > 0 ? '(out)' : '(in)'))
                  },
                  {
                    label: 'Tangential Velocity', 
                    value: selectedBody.isSun ? '0.00' : (isHoldingPlanet || selectedBody.isLocked ? '0.00' : Math.abs(selectedBody.orbitalVelocity.tangential).toFixed(2)),
                    suffix: selectedBody.isSun ? '(NaN)' : (isHoldingPlanet ? '(held)' : selectedBody.isLocked ? '(locked)' : (selectedBody.orbitalVelocity.tangential > 0 ? '(ccw)' : '(cw)'))
                  }
                ].map(({ label, value, suffix }) => (
                  <div key={label}>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm text-gray-400">
                        {value}
                        {suffix && <span className="text-xs ml-1">{suffix}</span>}
                      </span>
                    </label>
                  </div>
                ))
              )}
              {!isEditing && (
                <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded" onClick={() => {
                  setEditingValues({
                    name: selectedBody.name,
                    mass: selectedBody.mass,
                    size: selectedBody.size,
                    isLocked: selectedBody.isLocked ?? false
                  });
                  setIsEditing(true);
                }}>Edit</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhysicsSimulator; 