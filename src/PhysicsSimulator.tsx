import React, { useCallback, useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

interface CelestialBodyProperties {
  id: number;
  name: string;
  mass: number;
  size: number;
  color: string;
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
  color?: string;
}

const PhysicsSimulator: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [selectedBody, setSelectedBody] = useState<CelestialBodyProperties | null>(null);

  const [nextPlanetNumber, setNextPlanetNumber] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isHoldingPlanet, setIsHoldingPlanet] = useState(false);
  const [editingValues, setEditingValues] = useState<{
    name: string;
    mass: number;
    size: number;
    color: string;
    isLocked: boolean;
  } | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const grabModeRef = useRef(true);
  const selectedBodyRef = useRef(selectedBody);
  const isEditingRef = useRef(isEditing);



  // Physics constants
  const GRAVITY_CONSTANT = 0.5;
  const SUN_MASS = 10000;
  const SUN_RADIUS = 40;
  
  const createPlanet = useCallback((distance: number = 150 + Math.random() * 150, size: number = 8 + Math.random() * 12, planetNumberOverride?: number): ExtendedBody => {
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

    // Positive for counterclockwise orbit (apparently this is standard in math/physics, for some reason)
    const vx = Math.sin(angle) * orbitSpeed * 1.5;
    const vy = -Math.cos(angle) * orbitSpeed * 1.5;
    
    const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
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
    planet.color = color;
    return planet;
  }, [nextPlanetNumber]);

  const createPlanetRef = useRef(createPlanet);

  useEffect(() => {
    selectedBodyRef.current = selectedBody;
    isEditingRef.current = isEditing;
    createPlanetRef.current = createPlanet;
    if (mouseConstraintRef.current) {
      mouseConstraintRef.current.constraint.stiffness = 0.2;
      mouseConstraintRef.current.constraint.damping = 0.5;
    }
  }, [selectedBody, isEditing, createPlanet]);

  const calculateOrbitalVelocity = (body: Matter.Body, sun: Matter.Body) => {
    const dx = body.position.x - sun.position.x;
    const dy = body.position.y - sun.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Return zero velocity for locked or static bodies
    if ((body as ExtendedBody).isLocked || body.isStatic) {
      return {
        radial: 0,
        tangential: 0
      };
    }
    
    const radialX = dx / distance;
    const radialY = dy / distance;

    const radialVelocity = body.velocity.x * radialX + body.velocity.y * radialY;

    const tangentialVelocity = body.velocity.x * radialY - body.velocity.y * radialX;
    
    return {
      radial: radialVelocity,
      tangential: tangentialVelocity
    };
  };

  const calculatePlanetPosition = (body: Matter.Body, sun: Matter.Body) => {
    const dx = body.position.x - sun.position.x;
    const dy = body.position.y - sun.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees, nobody likes radians
    
    return {
      distance: distance,
      angle: (360 - angle) % 360 // Flip the angle so 0° is at the right
    };
  };

  const calculateGravitationalForce = (body: Matter.Body, sun: Matter.Body) => {
    const dx = sun.position.x - body.position.x;
    const dy = sun.position.y - body.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // F = G * M * m / r^2
    const force = (GRAVITY_CONSTANT * sun.mass * body.mass) / (distance * distance);
    return force;
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
    sun.name = 'Sun';
    sun.color = '#FFD700';

    // Use a local variable to assign unique numbers to the initial planets
    let initialPlanetNumber = 1;
    const planets: ExtendedBody[] = [
      createPlanetRef.current(100, 10, initialPlanetNumber++),
      createPlanetRef.current(150, 15, initialPlanetNumber++),
      createPlanetRef.current(200, 16, initialPlanetNumber++),
      createPlanetRef.current(250, 12, initialPlanetNumber++),
    ];
    // Set the next planet number for user-created planets
    setNextPlanetNumber(initialPlanetNumber);

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

      // Keep locked planets at zero velocity and delete planets too far from sun
      allBodies.forEach(body => {
        if ((body as ExtendedBody).isLocked) {
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
        }
        
        // Delete planets that are too far from the sun (more than 5000 pixels)
        if (!body.isSun && !(body as ExtendedBody).isLocked) {
          const dx = body.position.x - sun.position.x;
          const dy = body.position.y - sun.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5000) {
            Matter.World.remove(engine.world, body);
            // Clear selection if the deleted planet was selected
            if (selectedBodyRef.current && selectedBodyRef.current.id === body.id) {
              setSelectedBody(null);
            }
          }
        }
      });



      // Update selectedBody when hovering over a planet in grab mode
      if (isMouseDown && mouseConstraintRef.current?.mouse.position) {
        const mousePosition = mouseConstraintRef.current.mouse.position;
        const bodiesAtPoint = Matter.Query.point(allBodies.filter(b => !b.isSensor), mousePosition);
        const bodyUnderMouse = bodiesAtPoint[0] as ExtendedBody;

        if (bodyUnderMouse && !bodyUnderMouse.isSun && (!selectedBodyRef.current || selectedBodyRef.current.id !== bodyUnderMouse.id)) {
          const orbitalVelocity = calculateOrbitalVelocity(bodyUnderMouse, sun);
          setSelectedBody({
            id: bodyUnderMouse.id,
            name: bodyUnderMouse.name || 'Unknown',
            mass: bodyUnderMouse.mass,
            size: bodyUnderMouse.circleRadius! * 2,
            color: bodyUnderMouse.render.fillStyle?bodyUnderMouse.render.fillStyle:"?",
            orbitalVelocity,
            isSun: bodyUnderMouse.isSun
          });
        }
      }


    });

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA as ExtendedBody;
        const bodyB = pair.bodyB as ExtendedBody;
        
        // Only delete planets when they collide with the actual sun (not locked planets)
        if (bodyA.isSun && !bodyB.isSun) {
          // Planet collided with sun - delete the planet
          Matter.World.remove(engine.world, bodyB);
          if (selectedBodyRef.current && selectedBodyRef.current.id === bodyB.id) {
            setSelectedBody(null);
          }
        } else if (bodyB.isSun && !bodyA.isSun) {
          // Planet collided with sun - delete the planet
          Matter.World.remove(engine.world, bodyA);
          if (selectedBodyRef.current && selectedBodyRef.current.id === bodyA.id) {
            setSelectedBody(null);
          }
        }
      });
    });

    // Add collision active event to handle ongoing collisions
    Matter.Events.on(engine, 'collisionActive', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA as ExtendedBody;
        const bodyB = pair.bodyB as ExtendedBody;
        
        // Ensure locked planets stay at zero velocity
        if (bodyA.isLocked) {
          Matter.Body.setVelocity(bodyA, { x: 0, y: 0 });
        }
        if (bodyB.isLocked) {
          Matter.Body.setVelocity(bodyB, { x: 0, y: 0 });
        }
      });
    });

    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
        damping: 0.5
      },
      // Add collisionFilter to prevent grabbing in view mode
      collisionFilter: {
        mask: 0xFFFFFFFF
      }
    });

    let isMouseDown = false;
    render.canvas.addEventListener('mousedown', () => { 
      isMouseDown = true; 
      // If in grab mode and a planet is selected, set isHoldingPlanet true
      if (grabModeRef.current && selectedBodyRef.current) setIsHoldingPlanet(true);
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
        // If a new planet is selected while editing, exit edit mode and reset editingValues
        if (isEditingRef.current && selectedBodyRef.current && selectedBodyRef.current.id !== clickedBody.id) {
          setIsEditing(false);
          setEditingValues(null);
        }
        setSelectedBody({
          id: clickedBody.id,
          name: clickedBody.name || 'Unknown',
          mass: clickedBody.mass,
          size: clickedBody.circleRadius! * 2,
          color: (clickedBody as ExtendedBody).color || clickedBody.render.fillStyle || '#FFFFFF',
          orbitalVelocity,
          isSun: clickedBody.isSun,
          isLocked: clickedBody.isLocked
        });



        // Prevent grabbing if it's the sun or if the planet is locked
        if (clickedBody.isSun || clickedBody.isLocked) {
          mouseConstraint.collisionFilter.mask = 0x00000000;
        } else {
          mouseConstraint.collisionFilter.mask = 0xFFFFFFFF;
        }
      } else {
        setSelectedBody(null);
        // Exit edit mode when clicking on empty space
        if (isEditingRef.current) {
          setIsEditing(false);
          setEditingValues(null);
        }

      }
    });

    Matter.Composite.add(engine.world, [sun, ...planets, mouseConstraint]);
    render.mouse = mouse;
    mouseConstraintRef.current = mouseConstraint;

    const updateMouseConstraint = () => {
      if (mouseConstraintRef.current) {
        mouseConstraintRef.current.collisionFilter.mask = 0xFFFFFFFF;
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
          color: (body as ExtendedBody).color || (body as ExtendedBody).render.fillStyle || '#FFFFFF',
          orbitalVelocity,
          isSun: (body as ExtendedBody).isSun,
          isLocked: (body as ExtendedBody).isLocked ?? false
        }));
      } else {
        // If body not found, it was deleted
        setSelectedBody(null);
        setIsHoldingPlanet(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [selectedBody]);

  // Effect to update visual markers when selectedBody changes
  useEffect(() => {
    if (!engineRef.current) return;

    const updateVisualMarkers = () => {
      const allBodies = Matter.Composite.allBodies(engineRef.current!.world) as ExtendedBody[];
      allBodies.forEach(body => {
        if (!body.isSun) {
          const isSelected = selectedBodyRef.current && selectedBodyRef.current.id === body.id;
          if (isSelected) {
            // Add glowing outline for selected planet
            body.render.strokeStyle = '#FFFFFF';
            body.render.lineWidth = 3;
          } else {
            body.render.lineWidth = 0;
          }
        }
      });
    };

    // Update immediately
    updateVisualMarkers();

    // Also set up a continuous update
    const interval = setInterval(updateVisualMarkers, 100);

    return () => clearInterval(interval);
  }, []); // Run continuously to update visual markers

  return (
    <div className="w-full h-800 flex items-start justify-center bg-gray-900 p-4">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #374151;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #6B7280;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9CA3AF;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #6B7280 #374151;
          }
        `}
      </style>
      <div className="flex-1 flex flex-col items-center">
        <div 
          ref={sceneRef} 
          className="rounded-lg shadow-lg overflow-hidden"
        />
      </div>
      <div className="flex flex-col items-center">
        <div className="flex gap-4">
            <button 
              onClick={() => engineRef.current && Matter.Composite.add(engineRef.current.world, [createPlanetRef.current()])}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Add Planet
            </button>

          </div>

        <div className="w-80 ml-4 bg-gray-800 text-white rounded-lg shadow-lg p-4 sticky top-4">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Celestial Body Properties</h3>
            {!selectedBody && (
              <p className="text-sm text-gray-400 mt-2 mb-3">Select a planet to view its properties</p>
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
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">Color</span>
                      <input
                        type="color"
                        className="ml-2 px-[0.1rem] w-8 h-8 rounded border"
                        style={{ 
                          backgroundColor: 'transparent',
                          border: '0px solid #FFF'
                        }}
                        value={editingValues?.color ?? selectedBody.color}
                        onChange={e => {
                          if (editingValues) {
                            setEditingValues({ ...editingValues, color: e.target.value });
                          }
                        }}
                      />
                    </label>
                  </div>
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
                              setEditingValues({ ...editingValues, isLocked: e.target.checked });
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
                            setEditingValues({ ...editingValues, size: parseFloat(e.target.value) });
                          }
                        }}
                      />
                    </label>
                  </div>
                  <button className="mt-2 px-3 py-1 bg-blue-500 text-white rounded" onClick={() => {
                    if (editingValues && engineRef.current) {
                      const allBodies = Matter.Composite.allBodies(engineRef.current.world) as ExtendedBody[];
                      const body = allBodies.find(b => b.id === selectedBody.id);
                      if (body) {
                        // Name
                        body.name = editingValues.name;
                        // Mass (only for sun)
                        if (selectedBody.isSun) {
                          Matter.Body.setMass(body, editingValues.mass);
                          body.inverseMass = 1 / editingValues.mass;
                        }
                        // Color
                        body.render.fillStyle = editingValues.color;
                        (body as ExtendedBody).color = editingValues.color;
                        // Locked
                        if (!selectedBody.isSun) {
                          if (editingValues.isLocked) {
                            body.lockedVelocity = { x: body.velocity.x, y: body.velocity.y };
                            body.isLocked = true;
                            Matter.Body.setVelocity(body, { x: 0, y: 0 });
                          } else {
                            body.isLocked = false;
                            if (body.lockedVelocity) {
                              Matter.Body.setVelocity(body, body.lockedVelocity);
                              body.lockedVelocity = undefined;
                            }
                          }
                        }
                        // Size
                        const oldRadius = body.circleRadius || (body as any).radius || 1;
                        const newRadius = editingValues.size / 2;
                        const scale = newRadius / oldRadius;
                        Matter.Body.scale(body, scale, scale);
                        body.circleRadius = newRadius;
                        // Restore the mass to keep it independent of size
                        if (!selectedBody.isSun) {
                          Matter.Body.setMass(body, body.mass);
                        }
                      }
                      setSelectedBody({
                        ...selectedBody,
                        ...editingValues
                      });
                    }
                    setIsEditing(false);
                    setEditingValues(null);
                  }}>
                    Done
                  </button>
                </>
              ) : (
                [
                  { label: 'Name', value: selectedBody.name },
                  { label: 'Type', value: selectedBody.isSun ? 'Sun' : 'Planet' },
                  ...(selectedBody.isSun ? [{ label: 'Mass', value: selectedBody.mass.toFixed(2) }] : []),
                  { label: 'Size', value: `${selectedBody.size.toFixed(2)}px` },
                  { 
                    label: 'Color', 
                    value: selectedBody.color,
                    suffix: <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: selectedBody.color }}></div>
                  },
                  { 
                    label: 'Radial Velocity',
                    value: selectedBody.isSun ? '0.00' : (isHoldingPlanet || selectedBody.isLocked ? '0.00' : selectedBody.orbitalVelocity.radial.toFixed(2)),
                    suffix: selectedBody.isSun ? '(NaN)' : (isHoldingPlanet ? '(held)' : selectedBody.isLocked ? '(locked)' : (selectedBody.orbitalVelocity.radial > 0 ? '(out)' : '(in)'))
                  },
                  {
                    label: 'Tangential Velocity', 
                    value: selectedBody.isSun ? '0.00' : (isHoldingPlanet || selectedBody.isLocked ? '0.00' : Math.abs(selectedBody.orbitalVelocity.tangential).toFixed(2)),
                    suffix: selectedBody.isSun ? '(NaN)' : (isHoldingPlanet ? '(held)' : selectedBody.isLocked ? '(locked)' : (selectedBody.orbitalVelocity.tangential > 0 ? '(ccw)' : '(cw)'))
                  },
                  ...(selectedBody.isSun ? [] : [{
                    label: 'Distance from Sun',
                    value: engineRef.current ? (() => {
                      const allBodies = Matter.Composite.allBodies(engineRef.current!.world) as ExtendedBody[];
                      const sun = allBodies.find(body => body.isSun);
                      const body = allBodies.find(b => b.id === selectedBody.id);
                      if (sun && body) {
                        const position = calculatePlanetPosition(body, sun);
                        return `${position.distance.toFixed(1)}px`;
                      }
                      return '0.0px';
                    })() : '0.0px'
                  }]),
                  ...(selectedBody.isSun ? [] : [{
                    label: 'Angle from Sun',
                    value: engineRef.current ? (() => {
                      const allBodies = Matter.Composite.allBodies(engineRef.current!.world) as ExtendedBody[];
                      const sun = allBodies.find(body => body.isSun);
                      const body = allBodies.find(b => b.id === selectedBody.id);
                      if (sun && body) {
                        const position = calculatePlanetPosition(body, sun);
                        return `${position.angle.toFixed(1)}°`;
                      }
                      return '0.0°';
                    })() : '0.0°'
                  }]),
                  ...(selectedBody.isSun ? [] : [{
                    label: 'Gravitational Force',
                    value: engineRef.current ? (() => {
                      const allBodies = Matter.Composite.allBodies(engineRef.current!.world) as ExtendedBody[];
                      const sun = allBodies.find(body => body.isSun);
                      const body = allBodies.find(b => b.id === selectedBody.id);
                      if (sun && body) {
                        const force = calculateGravitationalForce(body, sun);
                        return `${force.toFixed(2)} units`;
                      }
                      return '0.00 units';
                    })() : '0.00 units'
                  }])
                ].map(({ label, value, suffix }: { label: string; value: string; suffix?: string | React.ReactElement }) => (
                  <div key={label}>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm text-gray-400 flex items-center">
                        {value}
                        {suffix && (typeof suffix === 'string' ? 
                          <span className="text-xs ml-1">{suffix}</span> : 
                          suffix
                        )}
                      </span>
                    </label>
                  </div>
                ))
              )}
              {!isEditing && (
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" onClick={() => {
                    setEditingValues({
                      name: selectedBody.name,
                      mass: selectedBody.mass,
                      size: selectedBody.size,
                      color: selectedBody.color,
                      isLocked: selectedBody.isLocked ?? false
                    });
                    setIsEditing(true);
                  }}>Edit</button>
                  {!selectedBody.isSun && (
                    <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors" onClick={() => {
                      if (engineRef.current) {
                        const allBodies = Matter.Composite.allBodies(engineRef.current.world) as ExtendedBody[];
                        const body = allBodies.find(b => b.id === selectedBody.id);
                        if (body) {
                          Matter.World.remove(engineRef.current.world, body);
                          setSelectedBody(null);
                          setIsEditing(false);
                          setEditingValues(null);
                        }
                      }
                    }}>Delete</button>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6 border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">All Planets:</h4>
            {engineRef.current && (() => {
              const allBodies = Matter.Composite.allBodies(engineRef.current!.world) as ExtendedBody[];
              const planets = allBodies.filter(body => !body.isSun);
              return planets.length > 0 ? (
                <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-600 rounded p-2 custom-scrollbar">
                  {planets.map((planet) => (
                    <button
                      key={planet.id}
                      onClick={() => {
                        const sun = allBodies.find(body => body.isSun);
                        if (sun) {
                          const orbitalVelocity = calculateOrbitalVelocity(planet, sun);
                          // Exit edit mode when selecting a new planet
                          if (isEditing) {
                            setIsEditing(false);
                            setEditingValues(null);
                          }
                          setSelectedBody({
                            id: planet.id,
                            name: planet.name || 'Unknown',
                            mass: planet.mass,
                            size: planet.circleRadius! * 2,
                            color: (planet as ExtendedBody).color || planet.render.fillStyle || '#FFFFFF',
                            orbitalVelocity,
                            isSun: planet.isSun,
                            isLocked: planet.isLocked
                          });
                        }
                      }}
                      className={`block w-full text-left px-2 py-1 text-sm rounded transition-colors flex items-center ${
                        selectedBody && selectedBody.id === planet.id 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2 border border-gray-500"
                        style={{ backgroundColor: (planet as ExtendedBody).color || planet.render.fillStyle || '#FFFFFF' }}
                      />
                      {planet.name || `Planet ${planet.id}`}
                      {planet.isLocked && <span className="text-xs text-yellow-400 ml-2">(Locked)</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No planets found</p>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicsSimulator; 