'use client';

import React, { useState, useMemo } from 'react';

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export type TrackType = 'kinder' | 'junior' | 'coder';
export type KinderSubTab = 'first-day' | 'priority-path' | 'curriculum' | 'trials' | 'store';

interface MissionTask {
  id: string;
  title: string;
  subtitle: string;
  category: 'Program Questions' | 'Role Identification' | 'Safety Protocol';
  expReward: number;
  coinReward: number;
  deadline: string;
  deadlineType: 'urgent' | 'normal' | 'relaxed';
  isLocked: boolean;
  isCompleted: boolean;
  requiredMissionId?: string;
  details: {
    summary: string;
    keyPoints: string[];
    actionLabel: string;
  };
}

interface DragItem {
  id: string;
  label: string;
  color: string;
  icon: string;
  actionDesc: string;
}

interface DropSlot {
  id: string;
  expectedItemId: string;
  targetDescription: string;
  matchedItemId?: string;
}

export interface OnboardingTask {
  id: string;
  pillar: 1 | 2 | 3;
  title: string;
  instruction: string;
  detail?: string;
  actionUrl?: string;
  isCompleted: boolean;
}

export interface LessonPlanChecklist {
  whatToDo: string;
  concept: string;
  activityGame: string;
  challenge: string;
}

export interface KinderLesson {
  code: string;
  topic: string;
  kit: string;
  type: 'spike' | 'codey' | 'circuits' | 'maker' | 'project' | 'game' | 'mouse' | 'drone' | 'puzzle';
  icon: string;
  term: 'term-1' | 'term-2' | 'term-3' | 'term-4';
  engineeringFocus: string;
  lessonPlan: LessonPlanChecklist;
}

export const KINDER_SYLLABUS_DATA: Record<string, { name: string; desc: string; lessons: KinderLesson[] }> = {
  'term-1': {
    name: 'Term 1',
    desc: 'Foundations of Robotics & Electrical Exploration (Lessons K1.01 – K1.10)',
    lessons: [
      {
        code: 'K1.01',
        topic: 'Introduction to Robots and Coding',
        kit: 'Spike Tank',
        type: 'spike',
        icon: '🤖',
        term: 'term-1',
        engineeringFocus: 'Motor drive mechanisms, wheel traction, and linear forward/backward motion.',
        lessonPlan: {
          whatToDo: 'Guide students to assemble two-wheel tank chassis with large motor; test run on mat.',
          concept: 'A robot is a machine with a motor and a brain that follows our instructions.',
          activityGame: 'Red Light, Green Light robot mimicry game with auditory stop cues.',
          challenge: 'Add protective front bumper bricks to shield the smart hub from wall impacts.'
        }
      },
      {
        code: 'K1.02',
        topic: 'Electric Circuits and Electrical Conductivity',
        kit: '<Electric circuit using Snap Circuits>',
        type: 'circuits',
        icon: '⚡',
        term: 'term-1',
        engineeringFocus: 'Closed circuit loop, battery power flow, conductive vs insulative materials.',
        lessonPlan: {
          whatToDo: 'Snap blue battery block to slide switch and lamp; test open vs closed loop.',
          concept: 'Electricity flows like water in a pipe; if there is a gap, the lamp stays asleep.',
          activityGame: 'Human Circuit circle game — hold hands to complete the imaginary circuit.',
          challenge: 'Insert motor fan spinner into the closed loop and observe rotation.'
        }
      },
      {
        code: 'K1.03',
        topic: 'Numbers to 10, Left and Right, Identification and uses of sensors, & Events and Sequence',
        kit: '<Using Codey Rocky>',
        type: 'codey',
        icon: '🐱',
        term: 'term-1',
        engineeringFocus: 'Directional navigation, wheel orientation, and sensor event triggers.',
        lessonPlan: {
          whatToDo: 'Drive Codey Rocky across the 1-10 number mat using directional arrow buttons.',
          concept: "Left and right are relative to the robot's nose, not the student's eyes.",
          activityGame: 'Robot Simon Says — Turn 90° right on chime, flash LED eyes on left.',
          challenge: 'Trigger a playful roar sound when obstacle sensor detects an object within 10cm.'
        }
      },
      {
        code: 'K1.04',
        topic: 'Pattern Recognition through Grouping & Sequence with Time and Speed',
        kit: 'Spike Kinder Tricycle',
        type: 'spike',
        icon: '🤖',
        term: 'term-1',
        engineeringFocus: 'Steering linkage, tricycle stability geometry, and variable motor speed durations.',
        lessonPlan: {
          whatToDo: 'Build 3-wheeled tricycle frame; adjust front fork angle and program motor duration.',
          concept: 'Speed = how fast; Time = how long. Fast speed for short time reaches the same spot as slow for long time.',
          activityGame: 'Turtle vs Cheetah movement race with clapping rhythm.',
          challenge: 'Create an alternating color pattern track (Red-Blue-Red-Blue) for the tricycle.'
        }
      },
      {
        code: 'K1.05',
        topic: 'Math Operators with Codey Rocky & Events and Sequence with Loudness',
        kit: '<Using Codey Rocky>',
        type: 'codey',
        icon: '🐱',
        term: 'term-1',
        engineeringFocus: 'Acoustic loudness sensor threshold, sound triggers, and basic addition/subtraction.',
        lessonPlan: {
          whatToDo: "Calibrate Codey Rocky's mic sensor to respond to child claps.",
          concept: 'The robot listens to sound volume; louder claps equal bigger numbers.',
          activityGame: 'Volume Whisper & Shout Game — whispering makes Codey crawl, shouting makes Codey stop.',
          challenge: "Add 2 claps + 3 claps and display 5 dots on Codey's LED matrix face."
        }
      },
      {
        code: 'K1.06',
        topic: 'Motor Manipulation with Moments',
        kit: 'Spike Egg Spinner, Spike Fishing Rod',
        type: 'spike',
        icon: '🤖',
        term: 'term-1',
        engineeringFocus: 'Rotational momentum, centrifugal force, spool winding, and gear leverage.',
        lessonPlan: {
          whatToDo: 'Construct high-speed egg spinner followed by manual reel fishing rod mechanism.',
          concept: 'Turning a big gear slowly turns a small gear very fast (spinning momentum).',
          activityGame: 'Spinning Top challenge — whose egg model spins longest without tumbling.',
          challenge: 'Add a ratchet lock to the fishing rod to stop the line from unwinding.'
        }
      },
      {
        code: 'K1.07',
        topic: 'Motor Manipulation with Angles and Power and Sequencing',
        kit: '<Using Codey Rocky>',
        type: 'codey',
        icon: '🐱',
        term: 'term-1',
        engineeringFocus: 'Precise rotation angles (45°, 90°, 180°), motor power limits, and turn sequencing.',
        lessonPlan: {
          whatToDo: 'Program Codey Rocky to trace an equilateral triangle and square on paper.',
          concept: 'An angle is how sharp we turn our robot before moving forward again.',
          activityGame: 'Floor Maze Navigation — turning through taped cardboard walls without bumping.',
          challenge: 'Program a victory spin of exactly 360 degrees when reaching the finish star.'
        }
      },
      {
        code: 'K1.08',
        topic: 'Positive and Negative Numbers, & Motor Manipulation with Numbers',
        kit: 'Spike Crocodile',
        type: 'spike',
        icon: '🤖',
        term: 'term-1',
        engineeringFocus: 'Bidirectional motor rotation (positive/clockwise, negative/counter-clockwise), gear teeth engagement.',
        lessonPlan: {
          whatToDo: 'Build crocodile jaw with reciprocal gear lever; program open (+) and snap shut (-).',
          concept: 'Positive numbers move forward/open; negative numbers reverse/close.',
          activityGame: 'Feeding the Crocodile — count fish blocks into the jaw before snap shut.',
          challenge: 'Add a warning growl sound 2 seconds before the jaws snap shut.'
        }
      },
      {
        code: 'K1.09',
        topic: 'Additions to 10, & Motor Manipulation with Numbers',
        kit: 'Spike Terminator',
        type: 'spike',
        icon: '🤖',
        term: 'term-1',
        engineeringFocus: 'Stepper motor increments, numerical target matching, and physical counter pointer.',
        lessonPlan: {
          whatToDo: 'Build Terminator pointer mechanism that rotates dial to match sum of two dice.',
          concept: 'Adding numbers together advances the pointer forward by the combined count.',
          activityGame: 'Dice roll math battle — roll two tactile dice and program pointer to the sum.',
          challenge: 'Program buzzer to beep the exact number of times equal to the answer.'
        }
      },
      {
        code: 'K1.10',
        topic: 'Term 1 Project',
        kit: '<Choose one robot from Term 1 along with requirements>',
        type: 'project',
        icon: '🏆',
        term: 'term-1',
        engineeringFocus: 'Capstone integration, independent build troubleshooting, and student project presentation.',
        lessonPlan: {
          whatToDo: 'Select 1 favorite robot from Term 1; rebuild, customize, and demonstrate to peers.',
          concept: 'An engineer combines what they learned to invent their own improved machine.',
          activityGame: '5-Minute Parent Showcase rehearsal — explaining how the robot moves and thinks.',
          challenge: 'Introduce 1 custom mechanical or code modification not shown in the base guide.'
        }
      }
    ]
  },
  'term-2': {
    name: 'Term 2',
    desc: 'Kinematics, Fractions, Mechanisms & Balance (Lessons K2.01 – K2.10)',
    lessons: [
      {
        code: 'K2.01',
        topic: 'Animation and Axis',
        kit: 'Spike Andy Roid',
        type: 'spike',
        icon: '🤖',
        term: 'term-2',
        engineeringFocus: 'Dual-axis movement (X and Y), humanoid arm linkages, and screen animation sync.',
        lessonPlan: {
          whatToDo: 'Build Andy Roid with articulated waving arms; sync arm motor with smiling LED face.',
          concept: 'An axis is a line that our robot parts spin around or slide along.',
          activityGame: "Mirror Game — students mimic Andy Roid's arm positions in time.",
          challenge: 'Program a dual-arm cheer celebration when light button is pressed.'
        }
      },
      {
        code: 'K2.02',
        topic: 'Concept of Fractions, & Events and Random',
        kit: 'Spike Wheel of Fortune',
        type: 'spike',
        icon: '🤖',
        term: 'term-2',
        engineeringFocus: 'Circular division (halves, quarters), random number generators, and friction stoppers.',
        lessonPlan: {
          whatToDo: 'Build segmented wheel with pointer needle; program random motor spin speed.',
          concept: 'A whole wheel cut into 4 equal slices gives each player 1 out of 4 chances.',
          activityGame: 'Classroom Reward Spinner — spin the wheel for sticker rewards and funny dances.',
          challenge: 'Color-code 4 equal quadrants and predict landing probability with tallies.'
        }
      },
      {
        code: 'K2.03',
        topic: 'Sequence - Movements',
        kit: 'Spike Mig Bot',
        type: 'spike',
        icon: '🤖',
        term: 'term-2',
        engineeringFocus: 'Walking gait geometry, center of gravity shift, and eccentric cam drives.',
        lessonPlan: {
          whatToDo: 'Assemble Mig Bot bipedal walker; calibrate leg offset to prevent falling over.',
          concept: 'Walking requires shifting weight from left to right before moving the feet.',
          activityGame: "Giant Robot Steps — walk with wide stance mimicking Mig Bot's gait.",
          challenge: 'Attach rubber friction boots to the feet to walk up a slight incline.'
        }
      },
      {
        code: 'K2.04',
        topic: 'Subtraction Within 10, & Motors with positive and negative numbers',
        kit: 'Spike Penguin',
        type: 'spike',
        icon: '🤖',
        term: 'term-2',
        engineeringFocus: 'Waddle locomotion, subtraction countdown sequence, and reverse motor drive.',
        lessonPlan: {
          whatToDo: 'Build waddling penguin model; program steps forward and backward subtraction.',
          concept: 'Subtraction means taking steps backward or counting down to zero.',
          activityGame: 'Melting Iceberg Game — penguin steps back 2 ice blocks each round.',
          challenge: 'Program a shivering sound effect when countdown reaches 0.'
        }
      },
      {
        code: 'K2.05',
        topic: 'Additions and Subtraction within 10, & Symmetry and Mechanism of a Balancing Beam',
        kit: '<Play with Monkey Business Game>',
        type: 'game',
        icon: '🐒',
        term: 'term-2',
        engineeringFocus: 'Mechanical equilibrium, lever arm distance (torque), and bilateral symmetry.',
        lessonPlan: {
          whatToDo: 'Hang weighted monkey counters on numbered beam pegs until perfectly level.',
          concept: '2 monkeys far from the center balance 4 monkeys close to the center!',
          activityGame: 'Teeter-Totter balancing game with math word problems.',
          challenge: 'Find 3 different combination pairs that balance a 10-peg load.'
        }
      },
      {
        code: 'K2.06',
        topic: 'Concept of Sound, & Sequence with Sound and Motor blocks',
        kit: 'Spike Gun',
        type: 'spike',
        icon: '🤖',
        term: 'term-2',
        engineeringFocus: 'Gear release triggers, kinetic energy launch, and synchronized sound effects.',
        lessonPlan: {
          whatToDo: 'Build safe foam dart launcher mechanism with motor trigger latch.',
          concept: 'Sounds have pitch (high/low) and rhythm; motors can fire on specific musical beats.',
          activityGame: 'Sound Orchestra — match drum beat sounds to launcher trigger actions.',
          challenge: 'Play a 3-note ascending fanfare before triggering the release pin.'
        }
      },
      {
        code: 'K2.07',
        topic: 'Map Reading, & Sequence – Movements and Turns',
        kit: '<Using Robot Mouse>',
        type: 'mouse',
        icon: '🐭',
        term: 'term-2',
        engineeringFocus: 'Grid coordinate mapping, spatial reasoning, and sequence memory buffer.',
        lessonPlan: {
          whatToDo: 'Lay maze tile path with cheese target; code sequence into mouse keypad.',
          concept: 'We plan the whole journey in our head before pressing the green GO button.',
          activityGame: "Human Mouse Maze — blindfolded student guided by partner's verbal code commands.",
          challenge: 'Navigate around 3 mud obstacles using the fewest total commands.'
        }
      },
      {
        code: 'K2.08',
        topic: 'Introduction to Gears',
        kit: 'Spike Gear System',
        type: 'spike',
        icon: '⚙️',
        term: 'term-2',
        engineeringFocus: 'Spur gears, driver vs follower gears, gear ratio speed/torque trade-off.',
        lessonPlan: {
          whatToDo: 'Assemble 8-tooth, 24-tooth, and 40-tooth gear train; count revolutions.',
          concept: 'Meshing teeth: one turns clockwise, the neighbor turns counter-clockwise!',
          activityGame: 'Hand-Crank Power test — feel the difference in effort between high and low gears.',
          challenge: 'Build a gear train that makes a fan turn 5 times faster than your motor.'
        }
      },
      {
        code: 'K2.09',
        topic: 'Remote Controlled Devices and Drone',
        kit: '<Using drones>',
        type: 'drone',
        icon: '🛸',
        term: 'term-2',
        engineeringFocus: 'Aerodynamic lift, pitch/roll/yaw control, and remote controller pairing.',
        lessonPlan: {
          whatToDo: 'Pair controller to micro-drone; practice gentle takeoff, hover, and landing.',
          concept: 'Propellers push air downward so the drone can float up like a hummingbird.',
          activityGame: 'Safe Landing Pad — take off from base and land gently inside a hula hoop.',
          challenge: 'Perform a controlled 360-degree hover turn without losing altitude.'
        }
      },
      {
        code: 'K2.10',
        topic: 'Term 2 Presentation',
        kit: '<Choose one robot from Term 2 along with requirements>',
        type: 'project',
        icon: '🏆',
        term: 'term-2',
        engineeringFocus: 'Public speaking, mechanism explanation, and parent consultation demonstration.',
        lessonPlan: {
          whatToDo: 'Select 1 Term 2 build; prepare demonstration and explain gear/motion principles.',
          concept: 'Great inventors know how to explain their inventions so anyone can understand!',
          activityGame: 'Mock Parent Showcase — demo robot movements with confidence and joy.',
          challenge: 'Answer 2 live questions about what gear or code block was used.'
        }
      }
    ]
  },
  'term-3': {
    name: 'Term 3',
    desc: 'Sensory Logic, Coordinates & Structural Mechanics (Lessons K3.01 – K3.10)',
    lessons: [
      {
        code: 'K3.01',
        topic: 'Measuring Force with Touch Sensor & If-Then Logic Statement with Touch Sensor',
        kit: 'Spike Windmill',
        type: 'spike',
        icon: '🤖',
        term: 'term-3',
        engineeringFocus: 'Push-button contact sensor, force detection threshold, and conditional If-Then logic.',
        lessonPlan: {
          whatToDo: 'Build windmill blades with touch sensor base; turn blades when sensor pressed.',
          concept: 'IF button is pressed, THEN spin the blades; ELSE stop the motor.',
          activityGame: 'Wind Storm simulation — pressing sensor softly spins slow, pressing hard spins fast.',
          challenge: 'Count how many times the blade rotates before touch sensor is released.'
        }
      },
      {
        code: 'K3.02',
        topic: 'Sequence Programming with Spike Software',
        kit: 'Spike Racing Car',
        type: 'spike',
        icon: '🤖',
        term: 'term-3',
        engineeringFocus: 'Drag-and-drop icon blocks, motor duration in seconds vs rotations, acceleration.',
        lessonPlan: {
          whatToDo: 'Build aerodynamic racer with differential back wheels; program speed ramp-up.',
          concept: 'Code blocks execute in order from top to bottom like words in a bedtime story.',
          activityGame: 'Drag Race Shootout — whose car travels closest to the 2-meter finish tape.',
          challenge: 'Program an automatic reverse return after crossing the finish line.'
        }
      },
      {
        code: 'K3.03',
        topic: 'Coding with X- and Y in programming world',
        kit: '<Puzzle activity>',
        type: 'puzzle',
        icon: '🧩',
        term: 'term-3',
        engineeringFocus: '2D Cartesian plane, column/row grid references, and directional vector shifts.',
        lessonPlan: {
          whatToDo: 'Solve tactile tile puzzle by mapping X (horizontal) and Y (vertical) moves.',
          concept: 'X is side-to-side (walk); Y is up-and-down (jump). Together they find any treasure.',
          activityGame: 'Pirate Treasure Grid — call out coordinates (X:3, Y:2) to find hidden coins.',
          challenge: 'Find the shortest Manhattan-distance path avoiding monster tiles.'
        }
      },
      {
        code: 'K3.04',
        topic: 'Exploration of Touch Sensor with Spike',
        kit: 'Spike One Arm Robot',
        type: 'spike',
        icon: '🤖',
        term: 'term-3',
        engineeringFocus: 'Single-arm lever arm, counterweights, and tactile bumper safety shutoff.',
        lessonPlan: {
          whatToDo: 'Build industrial robotic arm; lift block payload when touch sensor is triggered.',
          concept: 'The touch sensor works like our fingertip nerves feeling when we touch something.',
          activityGame: 'Factory Assembly Line — pick up widget, rotate 90°, drop into sorting bin.',
          challenge: 'Program emergency stop if touch sensor is bumped while moving.'
        }
      },
      {
        code: 'K3.05',
        topic: 'Gearing and Sequence',
        kit: 'Spike Door',
        type: 'spike',
        icon: '⚙️',
        term: 'term-3',
        engineeringFocus: 'Worm gear locking mechanism, rack and pinion linear sliding, security sequencing.',
        lessonPlan: {
          whatToDo: 'Build motorized vault door; program opening sequence with passcode taps.',
          concept: 'A worm gear cannot be pushed open by hand; only the motor screw can turn it.',
          activityGame: 'Secret Agent Vault — tap the correct 3-beat rhythm on touch sensor to open door.',
          challenge: 'Automatically close and lock the door after 5 seconds of passage.'
        }
      },
      {
        code: 'K3.06',
        topic: 'Sequencing with Spike Programming using Time',
        kit: 'Spike Jet',
        type: 'spike',
        icon: '✈️',
        term: 'term-3',
        engineeringFocus: 'Timed state machines, LED beacon flashing sequences, and pitch angle tilt.',
        lessonPlan: {
          whatToDo: 'Assemble supersonic jet with twin wing turbines; program countdown & takeoff.',
          concept: 'Computers count seconds precisely to keep airplanes flying on schedule.',
          activityGame: 'Airport Runway Departure — taxi for 3 seconds, full thrust for 4 seconds, cruise.',
          challenge: 'Sync flashing wingtip LED lights to blink every 0.5 seconds during flight.'
        }
      },
      {
        code: 'K3.07',
        topic: 'Mechanism of a Robot Hand',
        kit: 'Spike Grabber [Kinder Term 3]',
        type: 'spike',
        icon: '🤖',
        term: 'term-3',
        engineeringFocus: 'Four-bar linkage, scissor mechanism, gripping claws, and mechanical advantage.',
        lessonPlan: {
          whatToDo: 'Build extendable scissor grabber; pick up foam blocks of different sizes.',
          concept: 'Mechanical links transfer push at our hand into a pinch at the claw tip.',
          activityGame: 'Clean Up Ocean Trash challenge — use robot hand to scoop plastic bottles from bin.',
          challenge: 'Add soft rubber pads to claw tips to grip fragile plastic cups without crushing.'
        }
      },
      {
        code: 'K3.08',
        topic: 'Infrared sensor',
        kit: '<Using Codey Rocky>',
        type: 'codey',
        icon: '🐱',
        term: 'term-3',
        engineeringFocus: 'Infrared emitter & receiver, black line detection, and ambient light reflection.',
        lessonPlan: {
          whatToDo: 'Calibrate IR sensor on bottom of Codey; follow thick black line loop on white mat.',
          concept: 'Dark colors absorb invisible infrared light; white colors bounce it back like a mirror.',
          activityGame: 'Train on Track — Codey Rocky follows looping track while passengers climb aboard.',
          challenge: 'Stop automatically when an obstacle is placed directly on the track.'
        }
      },
      {
        code: 'K3.09',
        topic: 'Ultrasonic Sensor with Spike, & Math Operators and Length',
        kit: 'Spike Robot Cat',
        type: 'spike',
        icon: '🤖',
        term: 'term-3',
        engineeringFocus: 'Ultrasonic echolocation (sound bounce), distance measurement in cm, pet behavior states.',
        lessonPlan: {
          whatToDo: 'Build cat with ultrasonic sensor eyes; program purring when hand is petted within 15cm.',
          concept: 'The sensor sends out sound we cannot hear; it times the echo to know how far things are.',
          activityGame: 'Prowling Cat Game — creep closer to the mouse; stop when within 10 centimeters.',
          challenge: 'Hiss and back up if hand approaches closer than 5 centimeters!'
        }
      },
      {
        code: 'K3.10',
        topic: 'Term 3 Presentation',
        kit: '<Choose one robot from Term 3 along with requirements>',
        type: 'project',
        icon: '🏆',
        term: 'term-3',
        engineeringFocus: 'Sensor-driven robotics demonstration, peer review, and parent progress showcase.',
        lessonPlan: {
          whatToDo: 'Select 1 Term 3 robot utilizing touch or ultrasonic sensors; showcase live.',
          concept: 'Showing how sensors give robots senses like seeing and feeling!',
          activityGame: 'Live Sensor Demonstration — explain the If-Then code block to visiting parents.',
          challenge: 'Demonstrate recovery behavior when an unexpected obstacle is encountered.'
        }
      }
    ]
  },
  'term-4': {
    name: 'Term 4',
    desc: 'Sensors, 3D Fabrication, AR/VR & Advanced Showcases (Lessons K4.01 – K4.10)',
    lessons: [
      {
        code: 'K4.01',
        topic: 'Sequencing with Spike Programming Using Speed and Colour Sensor',
        kit: 'Spike Mouse',
        type: 'spike',
        icon: '🤖',
        term: 'term-4',
        engineeringFocus: 'Color recognition (Red, Green, Yellow), condition-based speed switching, line following.',
        lessonPlan: {
          whatToDo: 'Build Spike Mouse with color sensor facing floor; speed up on green, stop on red.',
          concept: 'Colors are like traffic lights for robots: Green means fast, Yellow slow, Red stop.',
          activityGame: 'Traffic Light Maze — follow color tape intersections across classroom floor.',
          challenge: 'Squeak three times and spin when finding yellow cheese block.'
        }
      },
      {
        code: 'K4.02',
        topic: 'X, Y and Z Axis & 3D Printing',
        kit: '<Using the 3D printing machine>',
        type: 'maker',
        icon: '🖨️',
        term: 'term-4',
        engineeringFocus: '3D spatial axes (X: width, Y: length, Z: height), layer-by-layer additive manufacturing.',
        lessonPlan: {
          whatToDo: 'Load eco-PLA filament; watch 3D printer slice and fabricate custom robot charm.',
          concept: 'Building with 2D drawings is flat like paper; adding the Z-axis gives height and thickness!',
          activityGame: 'Clay Layer Building — mimic 3D printer by extruding clay coils into a bowl shape.',
          challenge: 'Design a custom Lego-compatible name badge in kid-friendly 3D modeling app.'
        }
      },
      {
        code: 'K4.03',
        topic: 'Touch Sensor with Spike & Aerodynamics',
        kit: 'Spike Bird',
        type: 'spike',
        icon: '🤖',
        term: 'term-4',
        engineeringFocus: 'Wing flapping flapping mechanism, crank-rocker linkage, and touch-activated flight.',
        lessonPlan: {
          whatToDo: 'Build robotic bird with flapping wings; flap fast when touch sensor is clicked.',
          concept: 'Curved wings guide air faster over the top to create aerodynamic lift.',
          activityGame: 'Bird Migration Race — flap across classroom perching on designated tree branches.',
          challenge: 'Program wing flap frequency to decrease gradually as bird lands.'
        }
      },
      {
        code: 'K4.04',
        topic: 'Introduction to Augmented Reality & Story-Telling',
        kit: '<Do-It-Yourself Sunglasses>',
        type: 'maker',
        icon: '🕶️',
        term: 'term-4',
        engineeringFocus: 'Optical overlays, digital AR targets, storytelling narrative, and physical-digital merge.',
        lessonPlan: {
          whatToDo: 'Assemble safe DIY cardboard sunglasses with colored optical filters and AR target cards.',
          concept: 'Augmented Reality puts magical computer pictures right on top of real world toys!',
          activityGame: 'Dinosaur Safari — look through glasses at classroom walls to spot digital dinosaurs.',
          challenge: 'Tell a 1-minute story about your robot saving the digital creature.'
        }
      },
      {
        code: 'K4.05',
        topic: 'Colour Sensor',
        kit: 'Dancing Robot',
        type: 'spike',
        icon: '🤖',
        term: 'term-4',
        engineeringFocus: 'RGB color detection, dance choreography loops, and musical beat matching.',
        lessonPlan: {
          whatToDo: 'Build dual-motor dancing robot; show color flashcards to trigger dance moves.',
          concept: 'Different colors trigger different dance routines: Blue = waltz, Pink = hip-hop.',
          activityGame: 'Robot Dance Party — kids freeze dance alongside their customized robot partner.',
          challenge: 'Program a disco light show on the hub LED matrix while dancing.'
        }
      },
      {
        code: 'K4.06',
        topic: 'Concept of Light',
        kit: 'Spike Light Intensity Car',
        type: 'spike',
        icon: '💡',
        term: 'term-4',
        engineeringFocus: 'Ambient light intensity levels, lux measurement, automatic headlights.',
        lessonPlan: {
          whatToDo: 'Build explorer rover with light sensor; drive fast in dark and slow in daylight.',
          concept: 'Light is energy; our sensor measures brightness from 0 (midnight) to 100 (sunny noon).',
          activityGame: 'Flashlight Guide — guide the rover across dark room using flashlight beam.',
          challenge: 'Turn on LED headlights automatically when driving underneath table shadow.'
        }
      },
      {
        code: 'K4.07',
        topic: 'Touch Sensor and Loop with Codey Rocky & AND operator and If-Then Condition',
        kit: '<Use Codey Rocky>',
        type: 'codey',
        icon: '🐱',
        term: 'term-4',
        engineeringFocus: 'Repeat loops, boolean logic (AND operator requiring 2 simultaneous inputs), touch pins.',
        lessonPlan: {
          whatToDo: 'Wire fruit touch pads; program Codey to move ONLY when both touch pads pressed.',
          concept: 'AND means BOTH friends must agree before the robot starts dancing.',
          activityGame: 'Two-Player Cooperative steering — Player A holds left wire, Player B holds right.',
          challenge: 'Loop the victory dance 5 times before resting in sleep mode.'
        }
      },
      {
        code: 'K4.08',
        topic: 'Colour and Touch Sensor with Spike',
        kit: 'Spike Camera [Kinder Term 4]',
        type: 'spike',
        icon: '📷',
        term: 'term-4',
        engineeringFocus: 'Shutter release mechanism, photo flash simulation, dual-sensor composite logic.',
        lessonPlan: {
          whatToDo: 'Build retro camera replica; touch sensor acts as shutter button, color sensor detects subject.',
          concept: 'Cameras capture light and color the moment our finger presses the shutter trigger.',
          activityGame: 'Portrait Studio — kids take turns posing while partner presses camera shutter.',
          challenge: 'Play camera shutter click sound and flash white hub LEDs on every photo.'
        }
      },
      {
        code: 'K4.09',
        topic: 'Introduction to VR',
        kit: '<Do-It-Yourself Virtual Reality Glasses>',
        type: 'maker',
        icon: '🥽',
        term: 'term-4',
        engineeringFocus: 'Stereoscopic 3D vision, head tracking gyroscope, immersive simulation concepts.',
        lessonPlan: {
          whatToDo: 'Assemble DIY VR headset with biconvex lenses; view 360° space station exploration.',
          concept: 'Two lenses showing slightly different views trick our brain into seeing real 3D depth!',
          activityGame: 'Spacewalk Exploration — turn your head 360 degrees to spot planets and satellites.',
          challenge: 'Describe 3 mechanical details of the space rover observed in the VR simulator.'
        }
      },
      {
        code: 'K4.10',
        topic: 'Term 4 Presentation',
        kit: '<Choose one robot from Term 4 along with requirements>',
        type: 'project',
        icon: '🏆',
        term: 'term-4',
        engineeringFocus: 'Graduation showcase, comprehensive portfolio defense, and Kinder solo certification.',
        lessonPlan: {
          whatToDo: 'Select your best Term 4 build; demonstrate full autonomous code and mechanism.',
          concept: 'You are now an official Junior Roboticist and Creator!',
          activityGame: 'Grand Kinder Robotics Showcase — present project to branch manager and parents.',
          challenge: 'Receive official Kinder Solo Certification Certificate and graduation medal.'
        }
      }
    ]
  }
};

const getKitBadgeStyle = (type: KinderLesson['type']) => {
  switch (type) {
    case 'spike':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'codey':
      return 'bg-cyan-50 border-cyan-200 text-cyan-800';
    case 'circuits':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'maker':
      return 'bg-purple-50 border-purple-200 text-purple-800';
    case 'project':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    case 'game':
      return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'mouse':
      return 'bg-pink-50 border-pink-200 text-pink-800';
    case 'drone':
      return 'bg-indigo-50 border-indigo-200 text-indigo-800';
    case 'puzzle':
      return 'bg-green-50 border-green-200 text-green-800';
    default:
      return 'bg-slate-100 border-slate-200 text-slate-700';
  }
};

// ============================================================================
// MAIN COMPONENT: TrainingArea
// ============================================================================

export default function TrainingArea() {
  // 1. Track Selection State (Focused on 'kinder')
  const [selectedTrack, setSelectedTrack] = useState<TrackType>('kinder');

  // 2. Kinder Sub-tabs
  const [activeTab, setActiveTab] = useState<KinderSubTab>('first-day');

  // 3. Gamification State (EXP, Level, Coins)
  const [trainerExp, setTrainerExp] = useState<number>(320);
  const [coinBalance, setCoinBalance] = useState<number>(450);
  const [coinGainNotice, setCoinGainNotice] = useState<string | null>(null);

  // Day 1 Onboarding Tasks (3 Core Pillars)
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([
    {
      id: 'p1-email',
      pillar: 1,
      title: '1. Official Work Email Creation',
      instruction: 'Create official work email with format: [Nama].thelab@gmail.com',
      detail: 'Verified: farhan.thelab@gmail.com',
      isCompleted: true
    },
    {
      id: 'p1-sheet',
      pillar: 1,
      title: '2. Master Sheet Registration',
      instruction: 'Register account into Email Kerja All Karyawan.xlsx to activate services.',
      detail: 'Synced to HR Master Roster',
      isCompleted: true
    },
    {
      id: 'p1-portal',
      pillar: 1,
      title: '3. Instructor Portal Login',
      instruction: 'Action / URL link: web.thelab.id/login',
      actionUrl: 'https://web.thelab.id/login',
      detail: 'Active Session Authenticated',
      isCompleted: true
    },
    {
      id: 'p2-curriculum',
      pillar: 2,
      title: '1. Kinder & Junior Curriculum Library',
      instruction: 'Slides, teacher guides, robotics printable mats',
      isCompleted: true
    },
    {
      id: 'p2-schedules',
      pillar: 2,
      title: '2. Branch Schedules & Class Folders',
      instruction: 'Weekly student rosters and parent logsheets',
      isCompleted: false
    },
    {
      id: 'p2-personal',
      pillar: 2,
      title: '3. Your Folder: "The Lab Training"',
      instruction: 'Personal instructor evaluations and trial recordings',
      isCompleted: false
    },
    {
      id: 'p3-buddy',
      pillar: 3,
      title: '1. Buddy System',
      instruction: 'Pair new instructor with their assigned Senior Mentor / Wingman to guide them and answer questions.',
      detail: 'Assigned Wingman: Dian Pratama (Senior Trainer)',
      isCompleted: true
    },
    {
      id: 'p3-allies',
      pillar: 3,
      title: '2. Branch Allies Introduction',
      instruction: 'Meet your branch partners: SPA (Student Progress Advisor) & EC (Education Consultant)',
      detail: 'Review role briefings below',
      isCompleted: false
    }
  ]);

  const toggleOnboardingTask = (id: string) => {
    setOnboardingTasks(prev => {
      const target = prev.find(t => t.id === id);
      const next = target ? !target.isCompleted : false;
      if (next && target) {
        triggerReward(20, 15, target.title);
      }
      return prev.map(t => t.id === id ? { ...t, isCompleted: next } : t);
    });
  };

  // Computed Level
  const trainerLevel = useMemo(() => {
    return trainerExp >= 500 ? 2 : 1;
  }, [trainerExp]);

  const triggerReward = (exp: number, coins: number, reason: string) => {
    setTrainerExp(prev => prev + exp);
    setCoinBalance(prev => prev + coins);
    setCoinGainNotice(`+${coins} Coins & +${exp} EXP! (${reason})`);
    setTimeout(() => setCoinGainNotice(null), 3000);
  };

  // 4. First Day Mission State (Kinder)
  const [missions, setMissions] = useState<MissionTask[]>([
    {
      id: 'm-program',
      title: 'Detail Program (Kinder)',
      subtitle: 'Sensory Play, Tactile Blocks & Screen-Free Robotics for Ages 4–6',
      category: 'Program Questions',
      expReward: 60,
      coinReward: 35,
      deadline: 'Due in 2 days',
      deadlineType: 'normal',
      isLocked: false,
      isCompleted: true,
      details: {
        summary: 'Kinder curriculum fosters cognitive and fine-motor development through tangible blocks without screens.',
        keyPoints: [
          'Tactile Coding: Coloured physical blocks replace abstract code syntax.',
          'Sensory Motor Coordination: Large snap-on bricks safe for 4-year-olds.',
          'Story-driven Challenges: Children guide robot animals through rescue missions.',
          'Emotional Regulation: Building resilience when physical structures tumble.'
        ],
        actionLabel: 'Review Kinder Pedagogy Guide'
      }
    },
    {
      id: 'm-spa',
      title: 'Who is SPA? (Student Progress Advisor)',
      subtitle: 'Weekly Progress Tracking, Parent Consultation & Milestones',
      category: 'Role Identification',
      expReward: 50,
      coinReward: 25,
      deadline: 'Due Today, 17:00 WIB',
      deadlineType: 'urgent',
      isLocked: false,
      isCompleted: false,
      requiredMissionId: 'm-program',
      details: {
        summary: 'The SPA bridges the classroom experience to parents, ensuring consistent reporting and student retention.',
        keyPoints: [
          'Weekly Video Recaps: 30-second vertical clip sent to parents via WhatsApp.',
          'Zoho Milestone Logging: Log fine-motor and problem-solving badges within 2 hours.',
          'Parent Touchpoints: Monthly check-in calls addressing learning anxiety.',
          'Handshake Protocol: Trainers escalate behavioural patterns to SPA immediately.'
        ],
        actionLabel: 'View SPA Escalation Protocol'
      }
    },
    {
      id: 'm-ec',
      title: 'Who is EC? (Education Consultant)',
      subtitle: 'Trial Class Handover, Conversion Dynamics & Diagnostic Rubric',
      category: 'Role Identification',
      expReward: 50,
      coinReward: 25,
      deadline: 'Due Today, 18:30 WIB',
      deadlineType: 'urgent',
      isLocked: false,
      isCompleted: false,
      requiredMissionId: 'm-program',
      details: {
        summary: 'The EC drives student enrollment. Trainers partner with ECs during trial classes to demonstrate child joy and progress.',
        keyPoints: [
          'Pre-Trial Briefing: EC provides student background (e.g. shy, high energy, loves dinosaurs).',
          'The 5-Minute Parent Showcase: Trainer presents the built robot to parents at minute 40.',
          'Diagnostic Rubric: Immediate post-trial rating on Focus, Logic, and Curiosity.',
          'Handoff Protocol: Trainer transitions parents smoothly back to EC for enrollment closing.'
        ],
        actionLabel: 'View EC Handover Matrix'
      }
    }
  ]);

  const [activeModalMission, setActiveModalMission] = useState<MissionTask | null>(null);

  const toggleMissionCompletion = (id: string) => {
    setMissions(prev => {
      const target = prev.find(m => m.id === id);
      if (!target || target.isLocked) return prev;
      const nextCompleted = !target.isCompleted;

      if (nextCompleted) {
        triggerReward(target.expReward, target.coinReward, target.title);
      }

      return prev.map(m => {
        if (m.id === id) {
          return { ...m, isCompleted: nextCompleted };
        }
        // Unlock dependencies if m-program was completed
        if (id === 'm-program' && nextCompleted) {
          return { ...m, isLocked: false };
        }
        return m;
      });
    });
  };

  // 5. Priority Training Path State (Kinder)
  const [selectedTerm, setSelectedTerm] = useState<'term-1' | 'term-2' | 'term-3' | 'term-4' | 'all'>('term-1');
  const [instructorReady, setInstructorReady] = useState<boolean>(false);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [syllabusFilter, setSyllabusFilter] = useState<string>('');
  const [activeLessonModal, setActiveLessonModal] = useState<KinderLesson | null>(null);

  // Interactive Build Matrix & Video Submission State
  const [completedBuilds, setCompletedBuilds] = useState<Record<string, boolean>>({
    'K1.01': true,
    'K1.02': true,
    'K1.03': true,
    'K1.04': true,
    'K1.05': true,
  });

  const [videoLinks, setVideoLinks] = useState<Record<string, string>>({
    'K1.01': 'https://loom.com/share/demo-spike-tank-k101',
    'K1.03': 'https://drive.google.com/file/d/thelab-codey-demo/view',
    'K1.04': 'https://loom.com/share/tricycle-stability-demo',
  });

  const [expandedLessonId, setExpandedLessonId] = useState<string | null>('K1.01');
  const [editingVideoLessonId, setEditingVideoLessonId] = useState<string | null>(null);
  const [videoInputVal, setVideoInputVal] = useState<string>('');
  const [copiedSheetNotice, setCopiedSheetNotice] = useState<boolean>(false);
  const [masterUnlockOverride, setMasterUnlockOverride] = useState<boolean>(false);

  const allLessons = useMemo(() => {
    return Object.values(KINDER_SYLLABUS_DATA).flatMap(t => t.lessons);
  }, []);

  const currentTermData = useMemo(() => {
    if (selectedTerm === 'all') {
      return {
        name: 'All Terms',
        desc: 'Complete 40-Lesson Kinder Curriculum (Terms 1–4)',
        lessons: allLessons
      };
    }
    return KINDER_SYLLABUS_DATA[selectedTerm] || KINDER_SYLLABUS_DATA['term-1'];
  }, [selectedTerm, allLessons]);

  const visibleLessons = useMemo(() => {
    const base = currentTermData.lessons;
    const q = syllabusFilter.trim().toLowerCase();
    if (!q) return base;
    return base.filter(l =>
      l.code.toLowerCase().includes(q) ||
      l.topic.toLowerCase().includes(q) ||
      l.kit.toLowerCase().includes(q) ||
      l.engineeringFocus.toLowerCase().includes(q) ||
      l.lessonPlan.concept.toLowerCase().includes(q)
    );
  }, [currentTermData, syllabusFilter]);

  // Terms Progress & Sequential Lock State
  const termsProgress = useMemo(() => {
    const t1Lessons = KINDER_SYLLABUS_DATA['term-1'].lessons;
    const t2Lessons = KINDER_SYLLABUS_DATA['term-2'].lessons;
    const t3Lessons = KINDER_SYLLABUS_DATA['term-3'].lessons;
    const t4Lessons = KINDER_SYLLABUS_DATA['term-4'].lessons;

    const t1Builds = t1Lessons.filter(l => completedBuilds[l.code]).length;
    const t2Builds = t2Lessons.filter(l => completedBuilds[l.code]).length;
    const t3Builds = t3Lessons.filter(l => completedBuilds[l.code]).length;
    const t4Builds = t4Lessons.filter(l => completedBuilds[l.code]).length;

    const t1Videos = t1Lessons.filter(l => videoLinks[l.code]?.trim()).length;
    const t2Videos = t2Lessons.filter(l => videoLinks[l.code]?.trim()).length;
    const t3Videos = t3Lessons.filter(l => videoLinks[l.code]?.trim()).length;
    const t4Videos = t4Lessons.filter(l => videoLinks[l.code]?.trim()).length;

    const t1Unlocked = true;
    const t2Unlocked = masterUnlockOverride || t1Builds >= 10;
    const t3Unlocked = masterUnlockOverride || (t2Unlocked && t2Builds >= 10);
    const t4Unlocked = masterUnlockOverride || (t3Unlocked && t3Builds >= 10);

    return {
      'term-1': {
        key: 'term-1' as const,
        name: 'Term 1',
        subtitle: 'Foundations & Circuits',
        buildsDone: t1Builds,
        totalBuilds: 10,
        videosDone: t1Videos,
        percent: Math.round((t1Builds / 10) * 100),
        isUnlocked: t1Unlocked,
        isCompleted: t1Builds >= 10,
        lockMsg: ''
      },
      'term-2': {
        key: 'term-2' as const,
        name: 'Term 2',
        subtitle: 'Kinematics & Balance',
        buildsDone: t2Builds,
        totalBuilds: 10,
        videosDone: t2Videos,
        percent: Math.round((t2Builds / 10) * 100),
        isUnlocked: t2Unlocked,
        isCompleted: t2Builds >= 10,
        lockMsg: 'Complete all 10 practical builds in Term 1 to unlock Term 2.'
      },
      'term-3': {
        key: 'term-3' as const,
        name: 'Term 3',
        subtitle: 'Sensors & Coordinates',
        buildsDone: t3Builds,
        totalBuilds: 10,
        videosDone: t3Videos,
        percent: Math.round((t3Builds / 10) * 100),
        isUnlocked: t3Unlocked,
        isCompleted: t3Builds >= 10,
        lockMsg: 'Complete all 10 practical builds in Term 2 to unlock Term 3.'
      },
      'term-4': {
        key: 'term-4' as const,
        name: 'Term 4',
        subtitle: 'Sensors & 3D Maker',
        buildsDone: t4Builds,
        totalBuilds: 10,
        videosDone: t4Videos,
        percent: Math.round((t4Builds / 10) * 100),
        isUnlocked: t4Unlocked,
        isCompleted: t4Builds >= 10,
        lockMsg: 'Complete all 10 practical builds in Term 3 to unlock Term 4.'
      }
    };
  }, [completedBuilds, videoLinks, masterUnlockOverride]);

  // Real-time counters
  const totalBuildsCount = useMemo(() => {
    return allLessons.filter(l => completedBuilds[l.code]).length;
  }, [allLessons, completedBuilds]);

  const totalVideosCount = useMemo(() => {
    return allLessons.filter(l => videoLinks[l.code] && videoLinks[l.code].trim().length > 0).length;
  }, [allLessons, videoLinks]);

  const currentScopeBuildsCount = useMemo(() => {
    return visibleLessons.filter(l => completedBuilds[l.code]).length;
  }, [visibleLessons, completedBuilds]);

  const currentScopeVideosCount = useMemo(() => {
    return visibleLessons.filter(l => videoLinks[l.code] && videoLinks[l.code].trim().length > 0).length;
  }, [visibleLessons, videoLinks]);

  const toggleBuildCompleted = (lessonCode: string) => {
    setCompletedBuilds(prev => {
      const next = !prev[lessonCode];
      if (next) {
        triggerReward(20, 15, `${lessonCode} Practical Build Done`);

        // Check if completing this build finishes the term
        const termPrefix = lessonCode.slice(0, 2);
        const termMap: Record<string, string> = { 'K1': 'term-1', 'K2': 'term-2', 'K3': 'term-3', 'K4': 'term-4' };
        const tKey = termMap[termPrefix];
        if (tKey && KINDER_SYLLABUS_DATA[tKey as keyof typeof KINDER_SYLLABUS_DATA]) {
          const tLessons = KINDER_SYLLABUS_DATA[tKey as keyof typeof KINDER_SYLLABUS_DATA].lessons;
          const otherBuildsDone = tLessons.filter(l => l.code !== lessonCode && prev[l.code]).length;
          if (otherBuildsDone === tLessons.length - 1) {
            triggerReward(50, 40, `🎉 ${KINDER_SYLLABUS_DATA[tKey as keyof typeof KINDER_SYLLABUS_DATA].name} 100% Completed! Next Term Unlocked!`);
          }
        }
      }
      return { ...prev, [lessonCode]: next };
    });
  };

  const saveVideoLink = (lessonCode: string, url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setVideoLinks(prev => {
        const copy = { ...prev };
        delete copy[lessonCode];
        return copy;
      });
      setEditingVideoLessonId(null);
      return;
    }
    setVideoLinks(prev => ({ ...prev, [lessonCode]: trimmed }));
    setEditingVideoLessonId(null);
    setVideoInputVal('');
    triggerReward(30, 25, `${lessonCode} Video Proof Saved`);
  };

  const deleteVideoLink = (lessonCode: string) => {
    setVideoLinks(prev => {
      const copy = { ...prev };
      delete copy[lessonCode];
      return copy;
    });
    setEditingVideoLessonId(null);
  };

  const copyTaskSubmissionSheet = () => {
    const lines: string[] = [
      '# THE LAB INDONESIA — KINDER PRACTICAL BUILD & VIDEO SUBMISSION SHEET',
      `Instructor: Shafira Azzahra | Mentor: Dian Pratama | Date: ${new Date().toLocaleDateString('id-ID')}`,
      `Builds Completed: ${totalBuildsCount} / ${allLessons.length} | Videos Uploaded: ${totalVideosCount} / ${allLessons.length}`,
      '',
      '| Lesson Code | Topic | Hardware / Kit | Build Done? | Video Proof Link |',
      '| :--- | :--- | :--- | :---: | :--- |'
    ];

    allLessons.forEach(l => {
      const isDone = completedBuilds[l.code] ? '✅ YES' : '⬜ NO';
      const link = videoLinks[l.code] || '—';
      lines.push(`| ${l.code} | ${l.topic} | ${l.kit} | ${isDone} | ${link} |`);
    });

    const textToCopy = lines.join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedSheetNotice(true);
        triggerReward(10, 5, 'Submission Sheet Copied');
        setTimeout(() => setCopiedSheetNotice(false), 3500);
      }).catch(() => {
        alert('Submission sheet markdown copied to clipboard!');
      });
    }
  };

  const isLessonUnlocked = (lesson: KinderLesson, lessonIndex: number, list: KinderLesson[]) => {
    if (masterUnlockOverride) return true;
    const termProg = termsProgress[lesson.term as 'term-1' | 'term-2' | 'term-3' | 'term-4'];
    if (termProg && !termProg.isUnlocked) {
      return false;
    }
    if (lessonIndex === 0) return true;
    const prev = list[lessonIndex - 1];
    return !!completedBuilds[prev.code];
  };

  // 6. Interactive Training Curriculum State (Kinder)
  const [activeAccordionStep, setActiveAccordionStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=400&q=80'
  ]);
  const [activeLessonId, setActiveLessonId] = useState<number>(1);

  // Drag & Drop Matching Game State
  const initialDragItems: DragItem[] = [
    { id: 'item-green', label: 'Green Start Block', color: 'bg-emerald-500 text-white', icon: '🟢', actionDesc: 'Starts motor & moves robot forward' },
    { id: 'item-yellow', label: 'Yellow Sound Block', color: 'bg-amber-500 text-white', icon: '🟡', actionDesc: 'Plays animal sound (Lion roar / Bird)' },
    { id: 'item-red', label: 'Red Stop Block', color: 'bg-rose-500 text-white', icon: '🔴', actionDesc: 'Halts motor and turns off LED light' },
    { id: 'item-purple', label: 'Purple Loop Block', color: 'bg-purple-500 text-white', icon: '🟣', actionDesc: 'Repeats connected sequence 2 times' },
  ];

  const initialDropSlots: DropSlot[] = [
    { id: 'slot-start', expectedItemId: 'item-green', targetDescription: 'Drive forward 2 steps into the zoo' },
    { id: 'slot-sound', expectedItemId: 'item-yellow', targetDescription: 'Make a roar sound when seeing the tiger' },
    { id: 'slot-stop', expectedItemId: 'item-red', targetDescription: 'Stop the motor before the river wall' },
    { id: 'slot-loop', expectedItemId: 'item-purple', targetDescription: 'Repeat the dance sequence twice' },
  ];

  const [dragItems, setDragItems] = useState<DragItem[]>(initialDragItems);
  const [dropSlots, setDropSlots] = useState<DropSlot[]>(initialDropSlots);
  const [selectedDragId, setSelectedDragId] = useState<string | null>(null);

  const handleMatchSlot = (slotId: string, itemId: string) => {
    const slot = dropSlots.find(s => s.id === slotId);
    if (!slot) return;

    if (slot.expectedItemId === itemId) {
      // Correct match
      setDropSlots(prev => prev.map(s => s.id === slotId ? { ...s, matchedItemId: itemId } : s));
      setDragItems(prev => prev.filter(i => i.id !== itemId));
      setSelectedDragId(null);
      triggerReward(15, 10, 'Block Matched');
    } else {
      // Mismatch feedback
      alert('Oops! That block performs a different action. Give another block a try!');
    }
  };

  // Toggle Step Completion
  const toggleStepCompletion = (stepIndex: number) => {
    setCompletedSteps(prev => {
      const exists = prev.includes(stepIndex);
      const next = exists ? prev.filter(s => s !== stepIndex) : [...prev, stepIndex];
      if (!exists) {
        triggerReward(20, 15, `Step ${stepIndex + 1} Done`);
      }
      return next;
    });
  };

  // Check if Lesson 2 is Unlocked (Requires 3+ completed steps in Lesson 1)
  const isLesson2Unlocked = useMemo(() => {
    return completedSteps.length >= 3;
  }, [completedSteps]);

  // Image Upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setUploadedPhotos(prev => [uploadEvent.target!.result as string, ...prev]);
          triggerReward(20, 15, 'Robot Photo Uploaded');
        }
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const removePhoto = (idx: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0E1B4D] font-sans p-4 sm:p-6 lg:p-8">
      
      {/* ================================================================== */}
      {/* NOTIFICATION TOAST                                                 */}
      {/* ================================================================== */}
      {coinGainNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#0E1B4D] text-white px-5 py-3 rounded-xl shadow-2xl border border-[#45B7CD]/40 animate-bounce">
          <span className="text-xl">🎉</span>
          <span className="text-sm font-bold text-[#F6C551]">{coinGainNotice}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* TOP HEADER: TITLE & TRACK SELECTION                                */}
      {/* ================================================================== */}
      <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#EDF9FB] text-[#35A3B8] border border-[#45B7CD]/30">
                TRAINING OPS
              </span>
              <span className="text-xs text-slate-400 font-semibold">•</span>
              <span className="text-xs text-slate-500 font-semibold">The Lab Indonesia Operational Core</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E1B4D] tracking-tight">
              Training Area <span className="text-[#45B7CD]">Workspace</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select your teaching track and advance through gamified pedagogy missions, priority milestones, and interactive curricula.
            </p>
          </div>

          {/* Gamified Telemetry Badge */}
          <div className="flex items-center gap-4 bg-[#F8FAFC] border border-[#0E1B4D]/10 p-3.5 rounded-xl">
            {/* Level & EXP */}
            <div className="flex items-center gap-3 pr-4 border-r border-[#0E1B4D]/10">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#45B7CD] to-[#0E1B4D] flex items-center justify-center text-white font-extrabold shadow-sm">
                L{trainerLevel}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {trainerLevel === 1 ? 'Rookie Guide' : 'Certified Master'}
                </div>
                <div className="text-sm font-black text-[#0E1B4D]">{trainerExp} / 500 EXP</div>
                <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#45B7CD] to-[#F6C551] transition-all duration-500" 
                    style={{ width: `${Math.min(100, (trainerExp / 500) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Coin Balance */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪙</span>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reward Coins</div>
                <div className="text-lg font-black text-[#F6C551]">{coinBalance.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TRACK SELECTION BAR: [Kinder] | [Junior] | [Coder]                */}
        {/* ================================================================ */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
            Select Active Pedagogy Track
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Kinder Track Button */}
            <button
              onClick={() => setSelectedTrack('kinder')}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                selectedTrack === 'kinder'
                  ? 'bg-gradient-to-r from-[#FEF3C7]/40 to-white border-[#F59E0B] shadow-md ring-2 ring-[#F59E0B]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center text-xl font-bold">
                  🧸
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0E1B4D] text-base">Kinder Track</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                      Ages 4–6
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Sensory Play & Tactile Screen-Free Blocks</div>
                </div>
              </div>
              {selectedTrack === 'kinder' && (
                <span className="text-xs font-black text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-full">
                  ACTIVE
                </span>
              )}
            </button>

            {/* Junior Track Button */}
            <button
              onClick={() => setSelectedTrack('junior')}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                selectedTrack === 'junior'
                  ? 'bg-gradient-to-r from-[#EDF9FB] to-white border-[#45B7CD] shadow-md ring-2 ring-[#45B7CD]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EDF9FB] text-[#35A3B8] flex items-center justify-center text-xl font-bold">
                  ⚙️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0E1B4D] text-base">Junior Track</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Ages 7–12
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Block Coding, Gears & LEGO Spike</div>
                </div>
              </div>
              {selectedTrack === 'junior' && (
                <span className="text-xs font-black text-[#35A3B8] bg-[#EDF9FB] px-2.5 py-1 rounded-full">
                  ACTIVE
                </span>
              )}
            </button>

            {/* Coder Track Button */}
            <button
              onClick={() => setSelectedTrack('coder')}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                selectedTrack === 'coder'
                  ? 'bg-gradient-to-r from-[#EDE9FE] to-white border-[#8B5CF6] shadow-md ring-2 ring-[#8B5CF6]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-xl font-bold">
                  💻
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0E1B4D] text-base">Coder Track</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Ages 13+
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">MicroPython, Micro:bit & Vision AI</div>
                </div>
              </div>
              {selectedTrack === 'coder' && (
                <span className="text-xs font-black text-[#6D28D9] bg-[#EDE9FE] px-2.5 py-1 rounded-full">
                  ACTIVE
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* KINDER TRACK NAVIGATION TABS                                       */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('first-day')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'first-day'
              ? 'bg-[#0E1B4D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🚀</span>
          <span>First Day Mission</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-[#F59E0B] text-white font-black">
            {onboardingTasks.filter(t => t.isCompleted).length}/{onboardingTasks.length} Done
          </span>
        </button>

        <button
          onClick={() => setActiveTab('priority-path')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'priority-path'
              ? 'bg-[#0E1B4D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🗺️</span>
          <span>Priority Training Path</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'curriculum'
              ? 'bg-[#0E1B4D] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>📚</span>
          <span>Interactive Curriculum & Quiz</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isLesson2Unlocked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {isLesson2Unlocked ? 'Lesson 2 Unlocked 🔓' : 'Lesson 1 Active'}
          </span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* 1. GAMIFIED FIRST DAY MISSION (KINDER TRACK)                       */}
      {/* ================================================================== */}
      {activeTab === 'first-day' && (
        <div className="space-y-6">
          {/* Day 1 Launchpad / First Day Onboarding Header Banner */}
          <div className="bg-gradient-to-r from-[#0E1B4D] via-[#1E293B] to-[#0E1B4D] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#45B7CD]/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F59E0B]/20 text-[#F6C551] text-xs font-black border border-[#F59E0B]/30 mb-2">
                  <span>🚀</span> Day 1 Launchpad
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Welcome to The Lab Family! 🚀
                </h2>
                <p className="text-slate-200 text-sm font-semibold mt-1 leading-relaxed">
                  "We're excited to have you join our mission of inspiring the next generation of creators!"
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Day 1 Launchpad / First Day Onboarding • Kinder First Day Mission Hub
                </p>
              </div>

              {/* Achievement Badges Preview Shelf */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Kinder Milestone Badges
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-center" title="Kinder Empathy Star: Unlocked">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-lg">
                      🏆
                    </div>
                    <span className="text-[10px] text-emerald-300 font-bold mt-1">Empathy</span>
                  </div>
                  <div className="flex flex-col items-center" title="Tactile Master: Unlocked">
                    <div className="w-10 h-10 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center text-lg">
                      🧩
                    </div>
                    <span className="text-[10px] text-amber-300 font-bold mt-1">Tactile</span>
                  </div>
                  <div className="flex flex-col items-center" title={onboardingTasks.find(t => t.id === 'p3-allies')?.isCompleted ? 'SPA Master: Unlocked' : 'Locked'}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${onboardingTasks.find(t => t.id === 'p3-allies')?.isCompleted ? 'bg-cyan-500/30 border-cyan-400' : 'bg-white/5 border-white/20 grayscale opacity-40'}`}>
                      🛡️
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">SPA Ready</span>
                  </div>
                  <div className="flex flex-col items-center" title={onboardingTasks.find(t => t.id === 'p3-allies')?.isCompleted ? 'EC Partner: Unlocked' : 'Locked'}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${onboardingTasks.find(t => t.id === 'p3-allies')?.isCompleted ? 'bg-purple-500/30 border-purple-400' : 'bg-white/5 border-white/20 grayscale opacity-40'}`}>
                      🎖️
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">EC Handoff</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Day 1 Progress Bar */}
            {(() => {
              const totalTasksCount = onboardingTasks.length;
              const completedTasksCount = onboardingTasks.filter(t => t.isCompleted).length;
              const percent = Math.round((completedTasksCount / totalTasksCount) * 100);

              return (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">Day 1 Onboarding Progress</span>
                      <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] text-[#67E8F9]">
                        {completedTasksCount} / {totalTasksCount} Tasks Done
                      </span>
                    </div>
                    <span className="text-[#F6C551] font-black">{percent}% Completed</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#45B7CD] via-[#F59E0B] to-[#10B981] transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ================================================================ */}
          {/* 3 CORE ONBOARDING PILLARS                                         */}
          {/* ================================================================ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-[#0E1B4D]">
                  3 Core Onboarding Pillars
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify work identity, cloud curriculum storage access, and team connections.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#EDF9FB] text-[#35A3B8]">
                Day 1 Launchpad Checklist
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PILLAR 1: Work Identity & Account Setup */}
              {(() => {
                const p1Tasks = onboardingTasks.filter(t => t.pillar === 1);
                const isP1Done = p1Tasks.every(t => t.isCompleted);

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🪪</span>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pillar 1</span>
                        </div>
                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                          isP1Done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isP1Done ? 'Account & Portal Ready ✓' : 'In Progress'}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-[#0E1B4D] mb-1">
                        Work Identity &amp; Account Setup
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        Setup official email identity and verify access to the instructor web portal.
                      </p>

                      <div className="space-y-3">
                        {p1Tasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => toggleOnboardingTask(t.id)}
                            className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 cursor-pointer hover:border-[#45B7CD] transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={t.isCompleted}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 accent-[#10B981] cursor-pointer"
                            />
                            <div className="text-xs flex-1">
                              <div className="font-bold text-[#0E1B4D]">{t.title}</div>
                              <div className="text-slate-500 mt-0.5">{t.instruction}</div>
                              {t.actionUrl && (
                                <a
                                  href={t.actionUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-block text-[#45B7CD] font-bold mt-1 hover:underline"
                                >
                                  {t.actionUrl.replace('https://', '')} ↗
                                </a>
                              )}
                              {t.detail && (
                                <div className="text-emerald-600 font-bold text-[11px] mt-0.5">
                                  ✓ {t.detail}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Pillar Status:</span>
                      <span className={`font-black ${isP1Done ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isP1Done ? 'Account & Portal Ready' : 'Setup Incomplete'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* PILLAR 2: Knowledge Hub & Cloud Drive Setup */}
              {(() => {
                const p2Tasks = onboardingTasks.filter(t => t.pillar === 2);
                const isP2Done = p2Tasks.every(t => t.isCompleted);
                const p2CompletedCount = p2Tasks.filter(t => t.isCompleted).length;

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">☁️</span>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pillar 2</span>
                        </div>
                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                          isP2Done ? 'bg-emerald-100 text-emerald-800' : 'bg-[#EDF9FB] text-[#35A3B8]'
                        }`}>
                          {isP2Done ? 'Drive Setup Complete ✓' : `Access Checking (${p2CompletedCount}/3)`}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-[#0E1B4D] mb-1">
                        Knowledge Hub &amp; Cloud Drive Setup
                      </h4>

                      {/* Master Access Account */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                        <span>🔑</span>
                        <span>
                          Master Access Account: <code className="bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded font-bold">instructors@thelab.id</code>
                        </span>
                      </div>

                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Required Folder Access Checklist:
                      </div>

                      <div className="space-y-2.5">
                        {p2Tasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => toggleOnboardingTask(t.id)}
                            className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 cursor-pointer hover:border-[#45B7CD] transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={t.isCompleted}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 accent-[#10B981] cursor-pointer"
                            />
                            <div className="text-xs flex-1">
                              <div className="font-bold text-[#0E1B4D]">{t.title}</div>
                              <div className="text-slate-500 text-[11px] mt-0.5">{t.instruction}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Pillar Status:</span>
                      <span className={`font-black ${isP2Done ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isP2Done ? 'Drive Storage Setup Complete' : `Drive Storage Setup Complete (Pending ${3 - p2CompletedCount})`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* PILLAR 3: Wingman, Team & Culture */}
              {(() => {
                const p3Tasks = onboardingTasks.filter(t => t.pillar === 3);
                const isP3Done = p3Tasks.every(t => t.isCompleted);

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🤝</span>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pillar 3</span>
                        </div>
                        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                          isP3Done ? 'bg-emerald-100 text-emerald-800' : 'bg-[#EDE9FE] text-[#6D28D9]'
                        }`}>
                          {isP3Done ? 'Team & Culture Ready ✓' : 'Team Connection'}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-[#0E1B4D] mb-1">
                        Wingman, Team &amp; Culture
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        Connect with your branch wingman mentor and internal operational allies.
                      </p>

                      <div className="space-y-3">
                        {p3Tasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => toggleOnboardingTask(t.id)}
                            className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 cursor-pointer hover:border-[#45B7CD] transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={t.isCompleted}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 accent-[#10B981] cursor-pointer"
                            />
                            <div className="text-xs flex-1">
                              <div className="font-bold text-[#0E1B4D]">{t.title}</div>
                              <div className="text-slate-500 mt-0.5">{t.instruction}</div>
                              {t.detail && (
                                <div className="text-[#6D28D9] font-bold text-[11px] mt-0.5">
                                  {t.detail}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Core Cultural Mindset Callout */}
                        <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-3 text-xs">
                          <div className="flex items-center gap-1.5 font-black text-[#92400E] uppercase text-[11px] mb-1">
                            <span>💡</span> Core Cultural Mindset:
                          </div>
                          <p className="text-[#78350F] italic font-semibold leading-relaxed">
                            "Curious Explorer Mindset — Test tools with your hands first; playful curiosity is the best teacher!"
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Pillar Status:</span>
                      <span className={`font-black ${isP3Done ? 'text-emerald-600' : 'text-[#6D28D9]'}`}>
                        {isP3Done ? 'Wingman & Culture Complete' : 'Wingman & Culture Active'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. DETAILED PRIORITY TRAINING PATH (KINDER TRACK)                  */}
      {/* ================================================================== */}
      {activeTab === 'priority-path' && (
        <div className="space-y-6">
          {/* Controls Bar: Jump to Term/Level & Weekly Target Tracker */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              
              {/* Term & Level Jump Selectors */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🗺️</span>
                  <h2 className="text-lg font-black text-[#0E1B4D]">
                    Kinder Roadmap Navigation & Jump-To
                  </h2>
                </div>
                
                <div className="max-w-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Curriculum Term Jump
                    </label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-bold text-[#0E1B4D] focus:outline-none focus:ring-2 focus:ring-[#45B7CD]"
                    >
                      <option value="term-1">Term 1</option>
                      <option value="term-2">Term 2</option>
                      <option value="term-3">Term 3</option>
                      <option value="term-4">Term 4</option>
                    </select>
                  </div>
                </div>

                {/* Simulation Toggle for instructor_ready */}
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Demo Simulation:</span>
                  <button
                    onClick={() => setInstructorReady(!instructorReady)}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      instructorReady
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {instructorReady ? 'instructor_ready: TRUE (Certified)' : 'instructor_ready: FALSE (Delegated)'}
                  </button>
                  <span className="text-[11px] text-slate-400">Click to toggle delegation callout</span>
                </div>
              </div>

              {/* Circular Progress Ring: Weekly Target Tracker */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 flex items-center justify-center gap-5">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background track */}
                    <path
                      className="text-slate-200"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Progress stroke: 2/5 sessions = 40% */}
                    <path
                      className="text-[#45B7CD] transition-all duration-1000 ease-out"
                      strokeDasharray="40, 100"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-base font-black text-[#0E1B4D]">2 / 5</div>
                    <div className="text-[9px] font-extrabold text-slate-400 uppercase">Sessions</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-extrabold text-[#45B7CD] uppercase tracking-wider">Weekly Target</div>
                  <div className="text-sm font-black text-[#0E1B4D]">Kinder Sessions</div>
                  <div className="text-xs text-slate-500 mt-1">40% completed towards solo qualification quota</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Summary Matrix (Top Banner) */}
          <div className="bg-gradient-to-r from-[#0E1B4D] via-[#16235A] to-[#1E293B] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-white/10 relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#45B7CD]/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#45B7CD] text-white">
                    PRACTICAL BUILD MATRIX
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">Kinder Track Delivery</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Curriculum Practical Build &amp; Video Proof Tracker
                </h2>
                <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
                  Verify hands-on model builds and submit video recordings (Google Drive / Loom) to earn solo teaching authorization.
                </p>
              </div>

              {/* Real-Time Counters & Action Button */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Counter 1: Builds Done */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-xl font-black">
                    ✓
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">
                      BUILDS DONE
                    </div>
                    <div className="text-lg font-black text-white leading-none mt-0.5">
                      {currentScopeBuildsCount} <span className="text-xs font-semibold text-slate-300">/ {visibleLessons.length}</span>
                    </div>
                  </div>
                </div>

                {/* Counter 2: Videos Uploaded */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#45B7CD]/20 border border-[#45B7CD]/40 flex items-center justify-center text-[#45B7CD] text-lg font-black">
                    🎬
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-[#7dd3fc] uppercase tracking-wider">
                      VIDEOS UPLOADED
                    </div>
                    <div className="text-lg font-black text-white leading-none mt-0.5">
                      {currentScopeVideosCount} <span className="text-xs font-semibold text-slate-300">/ {visibleLessons.length}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button: Copy Task Submission Sheet */}
                <button
                  type="button"
                  onClick={copyTaskSubmissionSheet}
                  className="px-4 py-3 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>📋</span>
                  <span>Copy Task Submission Sheet</span>
                </button>
              </div>
            </div>

            {/* Toast notice when sheet copied */}
            {copiedSheetNotice && (
              <div className="mt-3 py-1.5 px-3 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <span>✓</span>
                <span>Task Submission Sheet copied to clipboard! Ready to paste into Slack / Google Sheets.</span>
              </div>
            )}
          </div>

          {/* 4-Term Progress Overview & Sequential Unlock Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            {(['term-1', 'term-2', 'term-3', 'term-4'] as const).map(tKey => {
              const prog = termsProgress[tKey];
              const isSelected = selectedTerm === tKey;
              return (
                <div
                  key={tKey}
                  onClick={() => setSelectedTerm(tKey)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#45B7CD] ring-2 ring-[#45B7CD]/20 shadow-sm'
                      : !prog.isUnlocked
                      ? 'bg-slate-50/80 border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-black text-[#0E1B4D]">{prog.name}</div>
                      <div className="text-[10.5px] font-semibold text-slate-500">{prog.subtitle}</div>
                    </div>
                    <div>
                      {!prog.isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                          🔒 LOCKED
                        </span>
                      ) : prog.isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ 10/10 DONE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200">
                          {prog.buildsDone}/10 BUILDS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prog.isCompleted ? 'bg-emerald-500' : prog.isUnlocked ? 'bg-[#45B7CD]' : 'bg-slate-300'
                      }`}
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>🛠️ {prog.buildsDone} / 10 Builds</span>
                    <span>🎬 {prog.videosDone} / 10 Videos</span>
                  </div>

                  {!prog.isUnlocked && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10.5px] font-bold text-amber-700 leading-tight">
                      🔒 {prog.lockMsg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Kinder Roadmap Term Syllabus & Interactive Checklist Card */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EDF9FB] text-[#45B7CD] flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  🗺️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-[#0E1B4D]">
                      {currentTermData.name} Syllabus &amp; Roadmap
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#EDF9FB] text-[#35A3B8] uppercase">
                      {visibleLessons.length} LESSONS ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentTermData.desc}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Term Quick Jump Pills with 'All' option and per-term progress counters */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['term-1', 'term-2', 'term-3', 'term-4', 'all'] as const).map(tKey => {
                    const isActive = selectedTerm === tKey;
                    const prog = tKey !== 'all' ? termsProgress[tKey] : null;
                    const isLocked = prog && !prog.isUnlocked;
                    const label = tKey === 'all'
                      ? `All (${totalBuildsCount}/40)`
                      : `${isLocked ? '🔒 ' : ''}${prog?.name} (${prog?.buildsDone}/10)`;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => setSelectedTerm(tKey)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          isActive
                            ? 'bg-[#45B7CD] text-white shadow-sm'
                            : isLocked
                            ? 'text-slate-400 hover:text-slate-600'
                            : 'text-slate-600 hover:text-[#0E1B4D] hover:bg-white/50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Filter Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    value={syllabusFilter}
                    onChange={(e) => setSyllabusFilter(e.target.value)}
                    placeholder="Search lesson / robot..."
                    className="pl-7 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-[#F8FAFC] text-[#0E1B4D] focus:outline-none focus:ring-1 focus:ring-[#45B7CD] w-44"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] text-slate-400">🔍</span>
                </div>

                {/* Demo Unlock Toggle */}
                <button
                  type="button"
                  onClick={() => setMasterUnlockOverride(!masterUnlockOverride)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    masterUnlockOverride
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                  title="Toggle sequential unlock restriction"
                >
                  {masterUnlockOverride ? '🔓 All Unlocked' : '🔒 Progressive Locks'}
                </button>
              </div>
            </div>

            {/* Locked Term Callout Banner */}
            {selectedTerm !== 'all' && !termsProgress[selectedTerm].isUnlocked && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 border-l-4 border-amber-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <div className="text-xs font-black text-amber-900 uppercase tracking-wider">
                      {termsProgress[selectedTerm].name} is Locked
                    </div>
                    <div className="text-xs font-medium text-amber-800 mt-0.5">
                      {termsProgress[selectedTerm].lockMsg} Complete prior builds to unlock this term.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMasterUnlockOverride(true)}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-black transition-colors whitespace-nowrap shadow-xs"
                >
                  🔓 Override Lock (Demo)
                </button>
              </div>
            )}

            {/* Interactive Lesson Cards & Accordions */}
            <div className="mt-4 space-y-3">
              {filteredLessons.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="text-2xl">🔍</span>
                  <div className="text-xs font-bold mt-1">No lessons match "{syllabusFilter}" in {currentTermData.name}</div>
                </div>
              ) : (
                filteredLessons.map((lesson, idx) => {
                  const isDone = !!completedBuilds[lesson.code];
                  const videoUrl = videoLinks[lesson.code];
                  const hasVideo = !!(videoUrl && videoUrl.trim().length > 0);
                  const isLocked = !isLessonUnlocked(lesson, idx, filteredLessons);
                  const isExpanded = expandedLessonId === lesson.code;
                  const isEditingVideo = editingVideoLessonId === lesson.code;

                  return (
                    <div
                      key={lesson.code}
                      className={`border rounded-xl transition-all duration-200 ${
                        isDone
                          ? 'bg-[#F0FDF4]/60 border-emerald-200 shadow-xs'
                          : isLocked
                          ? 'bg-slate-50/70 border-slate-200 opacity-75'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Main Lesson Summary Row */}
                      <div className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Checkbox for Build Completion */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => toggleBuildCompleted(lesson.code)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                              isLocked
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : isDone
                                ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300'
                                : 'bg-white border-2 border-slate-300 hover:border-[#45B7CD]'
                            }`}
                            title={isLocked ? 'Complete previous build to unlock' : isDone ? 'Mark build as incomplete' : 'Mark build as completed'}
                          >
                            {isLocked ? (
                              <span className="text-[10px]">🔒</span>
                            ) : isDone ? (
                              <span className="text-xs font-black">✓</span>
                            ) : null}
                          </button>

                          {/* Lesson Code Badge */}
                          <span className={`inline-flex items-center justify-center min-w-[58px] px-2.5 py-1 rounded-md font-black text-xs tracking-wide shadow-sm flex-shrink-0 ${
                            isDone ? 'bg-emerald-700 text-white' : 'bg-[#0E1B4D] text-white'
                          }`}>
                            {lesson.code}
                          </span>

                          {/* Lesson Topic Title */}
                          <div className="text-xs sm:text-sm font-bold text-[#0E1B4D] leading-snug truncate">
                            {lesson.topic}
                          </div>
                        </div>

                        {/* Right Metadata & Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                          {/* Hardware / Kit Badge */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold border ${getKitBadgeStyle(lesson.type)}`}>
                            <span>{lesson.icon}</span>
                            <span>{lesson.kit}</span>
                          </span>

                          {/* Video Evidence Status Pill */}
                          {hasVideo ? (
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="Click to view submitted video proof"
                            >
                              <span>🎬</span>
                              <span>Video Proof ✓</span>
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-500">
                              <span>⚪</span>
                              <span>No Video</span>
                            </span>
                          )}

                          {/* Expand/Collapse Accordion Button */}
                          <button
                            type="button"
                            onClick={() => setExpandedLessonId(isExpanded ? null : lesson.code)}
                            className={`px-3 py-1 rounded-md border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                              isExpanded
                                ? 'bg-[#0E1B4D] text-white border-[#0E1B4D]'
                                : 'bg-white border-slate-200 text-[#0E1B4D] hover:bg-slate-50'
                            }`}
                          >
                            <span>Details</span>
                            <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Accordion Content */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-[#F8FAFC]/80 p-4 sm:p-5 space-y-4 rounded-b-xl animate-fadeIn">
                          {/* 1. Engineering Focus & Objectives */}
                          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">⚙️</span>
                              <h4 className="text-xs font-black text-[#0E1B4D] uppercase tracking-wider">
                                Engineering Focus &amp; Objectives
                              </h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed pl-6">
                              {lesson.engineeringFocus}
                            </p>
                          </div>

                          {/* 2. Lesson Plan Checklist Items (4 Pillars) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                              <div className="text-[11px] font-black text-[#0E1B4D] flex items-center gap-1.5 mb-1">
                                <span>📋</span>
                                <span className="uppercase">What to do</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-snug">
                                {lesson.lessonPlan.whatToDo}
                              </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                              <div className="text-[11px] font-black text-[#45B7CD] flex items-center gap-1.5 mb-1">
                                <span>💡</span>
                                <span className="uppercase">Concept (ELI4)</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-snug">
                                {lesson.lessonPlan.concept}
                              </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                              <div className="text-[11px] font-black text-amber-600 flex items-center gap-1.5 mb-1">
                                <span>🎮</span>
                                <span className="uppercase">Activity / Games</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-snug">
                                {lesson.lessonPlan.activityGame}
                              </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                              <div className="text-[11px] font-black text-purple-600 flex items-center gap-1.5 mb-1">
                                <span>⚡</span>
                                <span className="uppercase">Building Challenge</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-snug">
                                {lesson.lessonPlan.challenge}
                              </p>
                            </div>
                          </div>

                          {/* 3. Video Evidence Submission Component */}
                          <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎬</span>
                                <div>
                                  <h4 className="text-xs font-black text-[#0E1B4D] uppercase tracking-wider">
                                    Video Evidence Submission
                                  </h4>
                                  <p className="text-[11px] text-slate-500">
                                    Provide a 30–60 second video demonstration link of the physical build operating.
                                  </p>
                                </div>
                              </div>

                              {!isEditingVideo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVideoLessonId(lesson.code);
                                    setVideoInputVal(videoUrl || '');
                                  }}
                                  className="px-3 py-1.5 bg-[#0E1B4D] hover:bg-[#1e293b] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
                                >
                                  <span>{hasVideo ? '✏️ Edit Video Link' : '➕ Add Video Link'}</span>
                                </button>
                              )}
                            </div>

                            {/* Display Mode vs Inline Input Mode */}
                            {isEditingVideo ? (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                                <input
                                  type="url"
                                  value={videoInputVal}
                                  onChange={(e) => setVideoInputVal(e.target.value)}
                                  placeholder="Paste Google Drive / Loom video link (e.g. https://loom.com/share/...)"
                                  className="flex-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#45B7CD] font-medium text-[#0E1B4D] bg-[#F8FAFC]"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                  <button
                                    type="button"
                                    onClick={() => saveVideoLink(lesson.code, videoInputVal)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition-colors shadow-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingVideoLessonId(null);
                                      setVideoInputVal('');
                                    }}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : hasVideo ? (
                              <div className="mt-2 flex flex-wrap items-center gap-3 bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-900 font-bold">
                                <span className="text-emerald-600 font-black">Recorded Video Link:</span>
                                <a
                                  href={videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline text-[#0E1B4D] hover:text-[#45B7CD] truncate max-w-sm"
                                >
                                  {videoUrl}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => deleteVideoLink(lesson.code)}
                                  className="text-[11px] font-extrabold text-rose-600 hover:underline ml-auto"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2 py-2 px-3 bg-slate-50 rounded-lg text-xs text-slate-500 font-medium italic">
                                No video link recorded. Click "Add Video Link" above to submit proof.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conditional Manager Delegation Note Callout */}
          {!instructorReady ? (
            <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border-l-4 border-[#F59E0B] p-5 rounded-r-2xl shadow-sm">
              <div className="flex items-start gap-4">
                <span className="text-3xl">⚠️</span>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#92400E] uppercase tracking-wider">
                      Branch Manager Delegation Note (Supervised Training)
                    </h3>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#F59E0B] text-white">
                      OVERSIGHT REQUIRED
                    </span>
                  </div>
                  <p className="text-xs text-[#78350F] leading-relaxed">
                    This instructor was assigned to Kinder classes early to meet branch capacity demands. Formal solo certification is pending. In accordance with The Lab Indonesia Quality Protocol, this instructor operates under the direct delegation of <strong>Sarah Wijaya (Branch Manager, Menteng Branch)</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-bold text-[#92400E]">
                    <span>✓ Authorized by: Sarah Wijaya</span>
                    <span>•</span>
                    <span>Classroom co-teaching sign-off mandatory</span>
                    <span>•</span>
                    <span>Valid until Solo Exam 100% complete</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#ECFDF5] border-l-4 border-emerald-500 p-5 rounded-r-2xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    Full Solo Certification Active
                  </div>
                  <div className="text-xs text-emerald-700">
                    Instructor is fully certified for independent Kinder delivery. No manager co-signature needed.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-200 px-3 py-1 rounded-full">
                CERTIFIED ✓
              </span>
            </div>
          )}

          {/* Video Integration: "How to Teach The Lab Way" */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div 
              onClick={() => setShowVideoModal(true)}
              className="relative w-full md:w-72 h-44 rounded-xl overflow-hidden cursor-pointer group shadow-md flex-shrink-0"
            >
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80" 
                alt="How to teach the Lab Way"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  ▶
                </div>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded">
                8:45 Min
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EDF9FB] text-[#35A3B8]">
                  CORE PEDAGOGY
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-semibold">Masterclass Video</span>
              </div>
              <h3 className="text-lg font-black text-[#0E1B4D]">
                How to Teach The Lab Way (Kinder Edition)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Watch Master Trainer Dian demonstrate the 3 Golden Rules: <em>"Discovery Before Theory"</em>, <em>"Never Touch the Student's Blocks"</em>, and <em>"Celebrate the Tumble"</em>.
              </p>
              
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0E1B4D] text-white text-xs font-bold hover:bg-[#1E293B] transition-colors flex items-center gap-2"
                >
                  <span>Play Masterclass Video</span>
                  <span>▶</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">Earns +50 Coins upon completion</span>
              </div>
            </div>
          </div>

          {/* Visual Roadmap / Timeline Nodes */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-[#0E1B4D] uppercase tracking-wider mb-6">
              Kinder Sequential Training Timeline
            </h3>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-[#45B7CD]/30 space-y-8">
              {/* Node 1: Completed */}
              <div className="relative">
                <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-600">PHASE 1 • COMPLETED</div>
                  <h4 className="text-sm font-black text-[#0E1B4D]">Kinder Safety & Classroom Setup</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Emergency protocol, fine motor parts sorting, and allergy hazard prevention.</p>
                </div>
              </div>

              {/* Node 2: Current Active */}
              <div className="relative">
                <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full bg-[#45B7CD] text-white flex items-center justify-center text-xs font-bold shadow-md ring-4 ring-[#45B7CD]/20 animate-pulse">
                  ⚡
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#45B7CD]">PHASE 2 • CURRENT IN-PROGRESS</div>
                  <h4 className="text-sm font-black text-[#0E1B4D]">Tactile Coding Foundations & Storytelling</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Mastering tangible sequence tiles, motor speed switches, and animal mimicry scripts.</p>
                </div>
              </div>

              {/* Node 3: Upcoming */}
              <div className="relative">
                <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">PHASE 3 • UP NEXT</div>
                  <h4 className="text-sm font-black text-slate-600">Kinder Trial Class Co-Delivery</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Shadowing 2 trial classes with Lead Trainer + performing the 5-minute parent showcase.</p>
                </div>
              </div>

              {/* Node 4: Final Certification */}
              <div className="relative">
                <div className="absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                  🔒
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">PHASE 4 • CERTIFICATION GATE</div>
                  <h4 className="text-sm font-black text-slate-600">Solo Teaching Practical Evaluation</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Evaluated live by Sarah Wijaya on student engagement, joy, and class management.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 3. INTERACTIVE TRAINING CURRICULUM (KINDER TRACK)                  */}
      {/* ================================================================== */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          
          {/* Lesson Selector Bar with Strict Progression Lock */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-[#0E1B4D]">
                  Kinder Level 1: Curriculum Progression
                </h2>
                <p className="text-xs text-slate-500">
                  Strict progression: Complete at least 3 components of Lesson 1 to unlock Lesson 2.
                </p>
              </div>

              {/* Completion Counter */}
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Lesson 1 Progress:</span>
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#EDF9FB] text-[#35A3B8]">
                  {completedSteps.length} / 5 Steps Done
                </span>
              </div>
            </div>

            {/* Lesson Cards Progression Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Lesson 1: Always Unlocked */}
              <button
                onClick={() => setActiveLessonId(1)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeLessonId === 1
                    ? 'border-[#45B7CD] bg-[#EDF9FB]/50 ring-2 ring-[#45B7CD]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-[#35A3B8]">LESSON 1</span>
                  <span className="text-xs">🔓 Active</span>
                </div>
                <div className="text-sm font-black text-[#0E1B4D]">Animal Robot Adventure</div>
                <div className="text-xs text-slate-500 mt-1">Tactile bricks, motor hub & animal rescue</div>
              </button>

              {/* Lesson 2: Dynamic Unlock Gate */}
              <button
                onClick={() => {
                  if (isLesson2Unlocked) setActiveLessonId(2);
                  else alert('🔒 Lesson 2 is locked! Complete at least 3 components of Lesson 1 to unlock.');
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  !isLesson2Unlocked
                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                    : activeLessonId === 2
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-extrabold ${isLesson2Unlocked ? 'text-emerald-700' : 'text-slate-400'}`}>
                    LESSON 2
                  </span>
                  <span className="text-xs">{isLesson2Unlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}</span>
                </div>
                <div className={`text-sm font-black ${isLesson2Unlocked ? 'text-[#0E1B4D]' : 'text-slate-400'}`}>
                  Motor Wonder Train
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {isLesson2Unlocked ? 'Pulleys, gears & speed switches' : 'Requires 3 components of Lesson 1'}
                </div>
              </button>

              {/* Lesson 3: Locked */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-400">LESSON 3</span>
                  <span className="text-xs">🔒 LOCKED</span>
                </div>
                <div className="text-sm font-black text-slate-400">Sound Sensing Puppy</div>
                <div className="text-xs text-slate-400 mt-1">Requires Lesson 2 completion</div>
              </div>
            </div>

            {/* Congratulations Banner if Lesson 2 Unlocked */}
            {isLesson2Unlocked && (
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <span>🎉</span>
                  <span><strong>Progression Unlocked:</strong> You completed 3+ components in Lesson 1! Lesson 2 is now available.</span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                  +50 EXP BONUS
                </span>
              </div>
            )}
          </div>

          {/* Lesson Plan Stepper / Accordion (5 Steps) */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-[#0E1B4D] mb-2">
              Lesson 1 Plan Stepper: Animal Robot Adventure
            </h3>

            {/* STEP 1: What to Do */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordionStep(activeAccordionStep === 0 ? -1 : 0)}
                className="w-full px-5 py-4 bg-[#F8FAFC] flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#0E1B4D] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Step 1</div>
                    <div className="text-sm font-black text-[#0E1B4D]">What to Do (Kickoff & Warmup)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {completedSteps.includes(0) && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  )}
                  <span className="text-slate-400 font-bold">{activeAccordionStep === 0 ? '▲' : '▼'}</span>
                </div>
              </button>

              {activeAccordionStep === 0 && (
                <div className="p-5 border-t border-slate-200 bg-white space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Begin with the 5-minute <strong>"Zoo Safari Rescue"</strong> story hook. Ask students: <em>"The baby giraffe is trapped across the river! Can our robot build a bridge and drive safely across?"</em>
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>Perform the 2-minute "Robot Stretch Warmup" (arms as robotic motors).</li>
                    <li>Demonstrate the tactile Green Start Block and Red Stop Block.</li>
                  </ul>
                  <button
                    onClick={() => toggleStepCompletion(0)}
                    className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0E1B4D] text-white hover:bg-[#1E293B]"
                  >
                    {completedSteps.includes(0) ? 'Unmark Step 1' : 'Mark Step 1 Completed ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: Tools & Dropzone UI */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordionStep(activeAccordionStep === 1 ? -1 : 1)}
                className="w-full px-5 py-4 bg-[#F8FAFC] flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#0E1B4D] text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Step 2</div>
                    <div className="text-sm font-black text-[#0E1B4D]">Tools & Robot Photo Dropzone</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {completedSteps.includes(1) && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  )}
                  <span className="text-slate-400 font-bold">{activeAccordionStep === 1 ? '▲' : '▼'}</span>
                </div>
              </button>

              {activeAccordionStep === 1 && (
                <div className="p-5 border-t border-slate-200 bg-white space-y-4">
                  <div className="text-xs text-slate-600 leading-relaxed">
                    Required Equipment: Kinder Tactile Bricks Set, Motor Core Hub, 2 Large Yellow Wheels, Green Start Tile, Yellow Sound Tile.
                  </div>

                  {/* File Dropzone UI for Image Attachments */}
                  <div className="border-2 border-dashed border-[#45B7CD]/40 rounded-xl p-6 bg-[#EDF9FB]/30 text-center relative hover:bg-[#EDF9FB]/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-3xl mb-1">📸</div>
                    <div className="text-xs font-extrabold text-[#0E1B4D]">
                      Drag & Drop Robot / Tool Photos Here or <span className="text-[#45B7CD] underline">Browse</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Upload build verification photos to earn +15 Coins per attachment
                    </div>
                  </div>

                  {/* Uploaded Photos Thumbnails Gallery */}
                  {uploadedPhotos.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 mb-2">Attached Build Photos:</div>
                      <div className="flex flex-wrap gap-3">
                        {uploadedPhotos.map((src, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
                            <img src={src} alt="Uploaded build" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removePhoto(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => toggleStepCompletion(1)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0E1B4D] text-white hover:bg-[#1E293B]"
                  >
                    {completedSteps.includes(1) ? 'Unmark Step 2' : 'Mark Step 2 Completed ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 3: Concept & Challenge */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordionStep(activeAccordionStep === 2 ? -1 : 2)}
                className="w-full px-5 py-4 bg-[#F8FAFC] flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#0E1B4D] text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Step 3</div>
                    <div className="text-sm font-black text-[#0E1B4D]">Concept & Challenge (Sequencing)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {completedSteps.includes(2) && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  )}
                  <span className="text-slate-400 font-bold">{activeAccordionStep === 2 ? '▲' : '▼'}</span>
                </div>
              </button>

              {activeAccordionStep === 2 && (
                <div className="p-5 border-t border-slate-200 bg-white space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Concept:</strong> Cause & Effect + Linear Sequencing. A robot only does what we command in the order we snap the tiles.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Mission Challenge:</strong> Program the robot to move forward 2 tiles, play an animal roar, and halt safely at the goal line without falling off the table edge.
                  </p>
                  <button
                    onClick={() => toggleStepCompletion(2)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0E1B4D] text-white hover:bg-[#1E293B]"
                  >
                    {completedSteps.includes(2) ? 'Unmark Step 3' : 'Mark Step 3 Completed ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 4: Activity / Games */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordionStep(activeAccordionStep === 3 ? -1 : 3)}
                className="w-full px-5 py-4 bg-[#F8FAFC] flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#0E1B4D] text-white flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Step 4</div>
                    <div className="text-sm font-black text-[#0E1B4D]">Activity & Games (Robot Freeze Dance)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {completedSteps.includes(3) && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  )}
                  <span className="text-slate-400 font-bold">{activeAccordionStep === 3 ? '▲' : '▼'}</span>
                </div>
              </button>

              {activeAccordionStep === 3 && (
                <div className="p-5 border-t border-slate-200 bg-white space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Classroom Game:</strong> <em>"Robot Freeze Dance"</em>. Play music: students press their Green Start Block to march their robots. When music pauses, they must tap the Red Stop Block. Teaches reaction time, observation, and motor control.
                  </p>
                  <button
                    onClick={() => toggleStepCompletion(3)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0E1B4D] text-white hover:bg-[#1E293B]"
                  >
                    {completedSteps.includes(3) ? 'Unmark Step 4' : 'Mark Step 4 Completed ✓'}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 5: Video Finder Tutorial Link */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordionStep(activeAccordionStep === 4 ? -1 : 4)}
                className="w-full px-5 py-4 bg-[#F8FAFC] flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#0E1B4D] text-white flex items-center justify-center text-xs font-bold">
                    5
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Step 5</div>
                    <div className="text-sm font-black text-[#0E1B4D]">Video Finder Tutorial Link</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {completedSteps.includes(4) && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  )}
                  <span className="text-slate-400 font-bold">{activeAccordionStep === 4 ? '▲' : '▼'}</span>
                </div>
              </button>

              {activeAccordionStep === 4 && (
                <div className="p-5 border-t border-slate-200 bg-white space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Watch the step-by-step build tutorial for the Animal Rescue Robot:
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-2xl">📺</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-[#0E1B4D]">Tutorial #KD-101: Animal Robot Assembly</div>
                      <div className="text-[11px] text-slate-500">Duration: 4:30 Min • High Quality Video Guide</div>
                    </div>
                    <button
                      onClick={() => setShowVideoModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#45B7CD] text-white text-xs font-bold hover:bg-[#35A3B8]"
                    >
                      Watch Tutorial ▶
                    </button>
                  </div>
                  <button
                    onClick={() => toggleStepCompletion(4)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0E1B4D] text-white hover:bg-[#1E293B]"
                  >
                    {completedSteps.includes(4) ? 'Unmark Step 5' : 'Mark Step 5 Completed ✓'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Drag & Drop Question Matching Game Skeleton/UI */}
          <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wider mb-1">
                  <span>🧩</span> Interactive Matching Game
                </div>
                <h3 className="text-base font-black text-[#0E1B4D]">
                  Match the Tactile Block to its Robot Action
                </h3>
                <p className="text-xs text-slate-500">
                  Click a block token on the left, then click its corresponding action slot on the right to complete the match.
                </p>
              </div>

              <button
                onClick={() => {
                  setDragItems(initialDragItems);
                  setDropSlots(initialDropSlots);
                  setSelectedDragId(null);
                }}
                className="text-xs font-bold text-[#45B7CD] hover:underline"
              >
                Reset Game ↺
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Draggable Block Tokens */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Available Coding Tiles ({dragItems.length})
                </div>
                {dragItems.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-emerald-300 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold">
                    🎉 Excellent! All blocks matched successfully!
                  </div>
                ) : (
                  dragItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedDragId(item.id === selectedDragId ? null : item.id)}
                      className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        selectedDragId === item.id
                          ? 'border-[#F59E0B] bg-[#FFFBEB] ring-2 ring-[#F59E0B]/30 scale-[1.02]'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <div className="text-left">
                          <div className="text-xs font-black text-[#0E1B4D]">{item.label}</div>
                          <div className="text-[11px] text-slate-500">{item.actionDesc}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#F59E0B]">
                        {selectedDragId === item.id ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Right Column: Drop Target Slots */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Target Robot Action Slots
                </div>
                {dropSlots.map(slot => {
                  const matchedItem = initialDragItems.find(i => i.id === slot.matchedItemId);

                  return (
                    <div
                      key={slot.id}
                      onClick={() => {
                        if (selectedDragId && !slot.matchedItemId) {
                          handleMatchSlot(slot.id, selectedDragId);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all ${
                        slot.matchedItemId
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : selectedDragId
                          ? 'border-dashed border-[#F59E0B] bg-[#FFFBEB]/40 hover:bg-[#FFFBEB] cursor-pointer'
                          : 'border-dashed border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-700">
                          {slot.targetDescription}
                        </div>
                        {matchedItem ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span>{matchedItem.icon}</span>
                            <span>{matchedItem.label}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold">
                            {selectedDragId ? 'Tap to place block' : 'Empty Slot'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gamified Quiz Preview & Teacher's Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Student Gamified View Mockup */}
            <div className="bg-gradient-to-br from-[#EDF9FB] to-white border border-[#45B7CD]/30 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <div className="text-xs font-extrabold text-[#35A3B8] uppercase">Student View Mockup</div>
                    <h4 className="text-sm font-black text-[#0E1B4D]">Kiko the Robot Quiz</h4>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-500 bg-amber-100 px-2.5 py-1 rounded-full">
                  ⭐ 3 Stars
                </span>
              </div>

              {/* Cheerful Question Card */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Question 1:</div>
                <div className="text-sm font-black text-[#0E1B4D] mb-3">
                  "Which block should Kiko tap to start walking into the jungle?"
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button className="p-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                    <span>🟢</span> Green Start Block
                  </button>
                  <button className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold flex items-center justify-center gap-2">
                    <span>🔴</span> Red Stop Block
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>🔊 Read aloud enabled</span>
                <span className="text-emerald-600 font-bold">Answer verified ✓</span>
              </div>
            </div>

            {/* Teacher's Guide to Simplify Concepts (ELI4) */}
            <div className="bg-white border border-[#0E1B4D]/10 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <div className="text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wider mb-1">
                  Pedagogical Reference
                </div>
                <h4 className="text-sm font-black text-[#0E1B4D]">
                  Teacher's Guide to Simplify Concepts (ELI4)
                </h4>
                <p className="text-xs text-slate-500">
                  Use these age-appropriate verbal analogies when explaining concepts to 4-year-olds:
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-black text-[#0E1B4D] mb-1">
                    1. How to explain an "Algorithm"
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "Just like your bedtime routine: 1. Put on pajamas, 2. Brush teeth, 3. Read a story! If we put pajamas on after the story, we might fall asleep in our clothes!"
                  </p>
                </div>

                <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-black text-[#0E1B4D] mb-1">
                    2. How to explain "Sensors"
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "Sensors are like the robot's eyes and ears. When it feels our hand tap its nose, it knows it's time to wake up and play!"
                  </p>
                </div>

                <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-black text-[#0E1B4D] mb-1">
                    3. Handling Frustration When Blocks Tumble
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    "High five! When the tower falls, that means our brain just found a new puzzle to solve. Let's make the base wider together!"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: MISSION DETAILS & BRIEFINGS                                 */}
      {/* ================================================================== */}
      {activeModalMission && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EDF9FB] text-[#35A3B8]">
                  {activeModalMission.category}
                </span>
                <h3 className="text-lg font-black text-[#0E1B4D] mt-1">
                  {activeModalMission.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalMission(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {activeModalMission.details.summary}
            </p>

            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-slate-200 mb-5 space-y-2">
              <div className="text-xs font-bold text-[#0E1B4D] uppercase tracking-wider">
                Operational Protocols:
              </div>
              {activeModalMission.details.keyPoints.map((kp, idx) => (
                <div key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-[#45B7CD] font-bold">•</span>
                  <span>{kp}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveModalMission(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toggleMissionCompletion(activeModalMission.id);
                  setActiveModalMission(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#0E1B4D] text-white hover:bg-[#1E293B]"
              >
                {activeModalMission.isCompleted ? 'Mark as Incomplete' : 'Complete & Earn Reward ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: VIDEO MASTERCLASS (HOW TO TEACH THE LAB WAY)                */}
      {/* ================================================================== */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E1B4D] rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F59E0B] text-white">
                  KINDER MASTERCLASS
                </span>
                <h3 className="text-lg font-black mt-1">
                  How to Teach The Lab Way (Kinder Screen-Free)
                </h3>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Video Player Simulation */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-white/10 flex items-center justify-center group">
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" 
                alt="Video Player"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-2xl shadow-2xl animate-pulse">
                  ▶
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg">
                <span>03:12 / 08:45</span>
                <span>Chapter 2: The Art of Tangible Questioning</span>
                <span>1080p HD</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-4 text-xs space-y-2 border border-white/10">
              <div className="font-bold text-[#F6C551]">Key Takeaway for Today's Class:</div>
              <p className="text-slate-200">
                When a 4-year-old struggles to attach a wheel, never grab the brick from their hand. Instead, hold your own sample block beside theirs and demonstrate the alignment. Let their fingers experience the satisfying snap click!
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  triggerReward(50, 30, 'Masterclass Video Watched');
                  setShowVideoModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#45B7CD] to-[#F59E0B] text-white font-extrabold text-xs shadow-lg hover:opacity-90"
              >
                Mark Masterclass Finished (+50 EXP, +30 Coins) ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Details Modal */}
      {activeLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1B4D]/75 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-gradient-to-r from-[#0E1B4D] to-[#1E293B] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeLessonModal.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-[#45B7CD] text-white">
                      {activeLessonModal.code}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {currentTermData.name}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-1 leading-snug">
                    {activeLessonModal.topic}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveLessonModal(null)}
                className="text-white/70 hover:text-white text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Hardware &amp; Equipment Required
                </div>
                <div className="text-sm font-extrabold text-[#0E1B4D] flex items-center gap-2">
                  <span>{activeLessonModal.icon}</span>
                  <span>{activeLessonModal.kit}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0E1B4D] mb-2">
                  Kinder Pedagogical Objectives (Ages 4–6)
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                  <li>Tangible discovery through physical mechanical models.</li>
                  <li>Cultivate pattern recognition, directionality (left/right), and cause-and-effect thinking.</li>
                  <li>Fine-motor coordination using safe, large tactile components and sensory triggers.</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-3">
                <div className="text-xs font-black text-blue-900 uppercase">
                  The Lab 3 Golden Rules Check
                </div>
                <p className="text-xs text-blue-800 mt-0.5">
                  1. Discovery Before Theory • 2. Never Touch the Student's Blocks • 3. Celebrate the Tumble
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveLessonModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0E1B4D] text-white text-xs font-bold hover:bg-[#1E293B]"
              >
                Got It &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
