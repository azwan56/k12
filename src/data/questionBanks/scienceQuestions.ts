import type { GradeLevel, PracticeQuestion } from '../k12Subjects';

const q = (
  id: string,
  grade: GradeLevel,
  track: string | undefined,
  question: string,
  options: string[],
  answer: number,
  explanation: string
): PracticeQuestion => ({ id, grade, track, question, options, answer, explanation });

export const SCIENCE_QUESTIONS: PracticeQuestion[] = [
  // =========================================================
  // Grade 6 Physics (25 questions)
  // =========================================================
  q('sc6p-1', 'G6', 'physics', 'A book rests on a table. The forces on it are…', [
    'Only gravity', 'Balanced: gravity down and the table’s support force up', 'Friction bigger than gravity', 'No forces at all'
  ], 1, 'An object staying at rest has balanced forces acting on it (net force = 0).'),
  q('sc6p-2', 'G6', 'physics', 'Which force opposes and slows down a box sliding across a carpet?', [
    'Magnetism', 'Friction', 'Upthrust', 'Light pressure'
  ], 1, 'Friction acts in the opposite direction to surface motion.'),
  q('sc6p-3', 'G6', 'physics', 'A lever with a longer effort arm helps us lift a heavy load by…', [
    'Making the load weigh more', 'Reducing the effort force we need', 'Destroying gravity', 'Turning metal into wood'
  ], 1, 'Levers trade a larger distance moved at the effort end for a smaller force needed.'),
  q('sc6p-4', 'G6', 'physics', 'On the Moon, compared with on Earth, an astronaut’s mass and weight are…', [
    'Same mass, smaller weight', 'Smaller mass, same weight', 'Both zero', 'Both larger'
  ], 0, 'Mass (amount of matter in kg) never changes; weight (in Newtons) drops because lunar gravity is weaker.'),
  q('sc6p-5', 'G6', 'physics', 'What standard SI unit is used to measure force?', [
    'Kilogram (kg)', 'Newton (N)', 'Meter (m)', 'Second (s)'
  ], 1, 'Forces like pushes, pulls, weight, and friction are measured in Newtons (N).'),
  q('sc6p-6', 'G6', 'physics', 'Why does adding oil between bicycle chain links reduce wear?', [
    'Oil acts as a lubricant that lowers friction between metal surfaces',
    'Oil doubles gravity on the pedals',
    'Oil increases air resistance',
    'Oil freezes the chain stiff'
  ], 0, 'Lubricants separate rough microscopic ridges and cut heat and wear from friction.'),
  q('sc6p-7', 'G6', 'physics', 'Which surface usually creates the HIGHEST friction for sneakers?', [
    'Wet polished ice', 'Dry rough rubber track', 'Soapy glass', 'Oiled steel'
  ], 1, 'Rough dry surfaces interlock tightly and provide high grip.'),
  q('sc6p-8', 'G6', 'physics', 'A steel ship floats while a solid steel marble sinks because…', [
    'Steel loses all mass when shaped like a boat',
    'The hollow ship displaces a huge volume of water, creating enough upthrust to match its weight',
    'Seawater cannot touch ship paint',
    'Ships use magnets on the seafloor'
  ], 1, 'Archimedes’ principle: an object floats when upthrust equals its total weight.'),
  q('sc6p-9', 'G6', 'physics', 'Which simple machine is an inclined plane wrapped around a cylinder?', [
    'Pulley', 'Wheel and axle', 'Screw', 'Spring balance'
  ], 2, 'A screw uses a spiral inclined ramp to convert small turning forces into strong holding force.'),
  q('sc6p-10', 'G6', 'physics', 'Two teams pull a rope in tug-of-war: Left pulls 300 N, Right pulls 260 N. What is the net force?', [
    '560 N right', '40 N left', '40 N right', '0 N'
  ], 1, 'Opposite forces subtract: 300 N − 260 N = 40 N toward the stronger Left pull.'),
  q('sc6p-11', 'G6', 'physics', 'A fixed single pulley at the top of a flagpole mainly helps by…', [
    'Changing the direction of your pull so you can pull downward',
    'Doubling the weight of the flag',
    'Removing air resistance',
    'Turning rope into cable'
  ], 0, 'Pulling downward lets gravity assist your body weight while raising the flag upward.'),
  q('sc6p-12', 'G6', 'physics', 'Why are racing cyclists’ helmets shaped like smooth teardrops?', [
    'To streamline airflow and cut air resistance (drag)',
    'To trap extra rain',
    'To weigh down the front wheel',
    'To increase wind noise'
  ], 0, 'Streamlined shapes let air glide smoothly past, reducing drag force.'),
  q('sc6p-13', 'G6', 'physics', 'Which instrument measures the magnitude of a pulling force using a coiled spring?', [
    'Thermometer', 'Spring balance (Newton meter)', 'Beaker', 'Barometer'
  ], 1, 'Spring extension stays proportional to pulling force within its elastic limit.'),
  q('sc6p-14', 'G6', 'physics', 'If the North pole of one bar magnet faces the North pole of another magnet, they will…', [
    'Attract strongly', 'Repel each other', 'Lose magnetism instantly', 'Melt together'
  ], 1, 'Like magnetic poles (N–N or S–S) repel; opposite poles (N–S) attract.'),
  q('sc6p-15', 'G6', 'physics', 'Why do wide snowshoes keep hikers from sinking deep into soft snow?', [
    'They cut the hiker’s mass in half',
    'They spread the same weight over a larger area, reducing pressure on the snow',
    'They melt all the snow beneath',
    'They create magnetic lift'
  ], 1, 'Pressure = Force ÷ Area; larger contact area lowers downward pressure.'),
  q('sc6p-16', 'G6', 'physics', 'A cyclist coasts on flat pavement and stops pedaling. Why does the bike gradually slow down?', [
    'Because forward motion requires zero force only until friction and air resistance push backward',
    'Because mass runs out of energy',
    'Because gravity turns sideways',
    'Because tires shrink'
  ], 0, 'Unbalanced backward forces (tire friction + air drag) decelerate the bike.'),
  q('sc6p-17', 'G6', 'physics', 'Which part of a pair of scissors acts as the fulcrum?', [
    'The plastic finger loops', 'The central metal pivot screw', 'The sharp cutting tips', 'The blade edge'
  ], 1, 'The pivot pin is the fixed turning point (fulcrum) of a first-class double lever.'),
  q('sc6p-18', 'G6', 'physics', 'A parachute slows a skydiver’s fall mainly by greatly increasing…', [
    'Gravity', 'Air resistance (upward drag)', 'Magnetic pull', 'Friction with the grass'
  ], 1, 'Wide canopy area collides with far more air molecules, pushing upward against gravity.'),
  q('sc6p-19', 'G6', 'physics', 'Which metal is strongly attracted by a magnet?', [
    'Aluminum foil', 'Copper wire', 'Iron nail', 'Gold ring'
  ], 2, 'Iron (along with nickel and cobalt) is ferromagnetic; copper, gold, and aluminum are non-magnetic.'),
  q('sc6p-20', 'G6', 'physics', 'What happens to a stretched rubber band if you let go of one end?', [
    'Elastic potential energy converts into kinetic energy of motion',
    'Gravity reverses upward forever',
    'Friction disappears',
    'Its temperature drops to absolute zero'
  ], 0, 'Stored elastic energy quickly becomes kinetic energy as the band snaps back.'),
  q('sc6p-21', 'G6', 'physics', 'On a distance-time graph, what does a flat horizontal line mean?', [
    'The object is speeding up steeply',
    'The object is stationary (not moving)',
    'The object is moving backward at high speed',
    'Time stopped moving'
  ], 1, 'Distance stays constant as time passes, meaning zero speed.'),
  q('sc6p-22', 'G6', 'physics', 'Why is a heavy ramp helpful when loading a piano onto a truck?', [
    'It reduces total work done to zero',
    'It lets you push with less force over a longer inclined distance',
    'It turns the piano lighter in kg',
    'It doubles gravity'
  ], 1, 'An inclined plane reduces the required push force by increasing distance.'),
  q('sc6p-23', 'G6', 'physics', 'If you push a shopping cart with MORE force while keeping mass constant, the cart’s acceleration will…', [
    'Decrease', 'Stay unchanged', 'Increase', 'Become negative'
  ], 2, 'A larger net force on the same mass creates greater acceleration.'),
  q('sc6p-24', 'G6', 'physics', 'Where does Earth’s gravitational pull on an apple point?', [
    'Toward the nearest ocean', 'Toward the center of the Earth', 'Straight north along longitude', 'Outward toward space'
  ], 1, 'Gravity pulls every object radially inward toward Earth’s center.'),
  q('sc6p-25', 'G6', 'physics', 'Why do doorknobs sit near the far edge of a door instead of right next to the hinges?', [
    'Greater distance from the hinges gives more turning effect (leverage) with less push',
    'To save wood in the middle',
    'Because hinges block metal paint',
    'To increase door weight'
  ], 0, 'Increasing perpendicular distance from the hinge pivot maximizes turning moment.'),

  // =========================================================
  // Grade 6 Biology (25 questions)
  // =========================================================
  q('sc6b-1', 'G6', 'biology', 'Which structure is found in plant cells but NOT in animal cells?', [
    'Nucleus', 'Mitochondria', 'Chloroplast', 'Cell membrane'
  ], 2, 'Chloroplasts capture light energy to run photosynthesis in plant cells.'),
  q('sc6b-2', 'G6', 'biology', 'Which gas do green plants absorb from air as a raw material for photosynthesis?', [
    'Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'
  ], 1, 'Carbon dioxide + water + light energy → glucose + oxygen.'),
  q('sc6b-3', 'G6', 'biology', 'In the food chain grass → rabbit → fox, the rabbit is a…', [
    'Producer', 'Primary consumer', 'Top predator', 'Decomposer'
  ], 1, 'Herbivores that eat green producers directly are primary consumers.'),
  q('sc6b-4', 'G6', 'biology', 'Which cell organelle acts as the "control center" containing DNA?', [
    'Vacuole', 'Nucleus', 'Cell wall', 'Chloroplast'
  ], 1, 'The nucleus stores genetic instructions regulating cell growth and activities.'),
  q('sc6b-5', 'G6', 'biology', 'Why do roots grow tiny root hairs underground?', [
    'To catch sunlight',
    'To greatly increase surface area for absorbing water and mineral ions',
    'To make flowers smell sweet',
    'To store green chlorophyll'
  ], 1, 'Microscopic root hair extensions speed up osmosis of soil water.'),
  q('sc6b-6', 'G6', 'biology', 'What is the main function of the rigid cellulose cell wall around plant cells?', [
    'To pump blood',
    'To give shape, strength, and prevent bursting when full of water',
    'To produce carbon dioxide',
    'To digest meat'
  ], 1, 'The cell wall provides structural support so plants can stand upright.'),
  q('sc6b-7', 'G6', 'biology', 'Which group of organisms breaks down dead leaves and logs into soil nutrients?', [
    'Producers', 'Decomposers (fungi & bacteria)', 'Carnivores', 'Herbivores'
  ], 1, 'Decomposers recycle minerals back into ecosystems for producers to reuse.'),
  q('sc6b-8', 'G6', 'biology', 'When testing a green leaf for starch with iodine solution, a dark blue-black color proves…', [
    'The leaf stayed in pitch darkness all week',
    'Photosynthesis made glucose which was stored as starch',
    'The leaf is made of plastic',
    'Water froze inside the leaf'
  ], 1, 'Iodine turns blue-black in the presence of starch stored from photosynthesis.'),
  q('sc6b-9', 'G6', 'biology', 'Tiny pores on the underside of leaves that open to let gases enter and leave are called…', [
    'Stomata', 'Petals', 'Tendons', 'Capillaries'
  ], 0, 'Guard cells control stomata opening for CO₂ intake and oxygen/water vapor release.'),
  q('sc6b-10', 'G6', 'biology', 'What happens in a food web if disease removes almost all snakes that eat mice?', [
    'Mouse population initially increases while grass declines from heavier grazing',
    'Sunlight turns off',
    'Hawks multiply immediately with zero mice',
    'Nothing else changes'
  ], 0, 'Removing a predator triggers ripple effects up and down trophic links.'),
  q('sc6b-11', 'G6', 'biology', 'Which microscope part do you look through at the top of the tube?', [
    'Stage clips', 'Eyepiece lens', 'Diaphragm', 'Mirror base'
  ], 1, 'Total magnification = eyepiece magnification × objective lens magnification.'),
  q('sc6b-12', 'G6', 'biology', 'In an animal cell, which jelly-like fluid holds organelles and is where most chemical reactions take place?', [
    'Cytoplasm', 'Chloroplast', 'Cellulose wall', 'Sap vacuole'
  ], 0, 'Cytoplasm fills the cell interior around the nucleus and organelles.'),
  q('sc6b-13', 'G6', 'biology', 'Why does every food chain begin with a producer like algae or grass?', [
    'Animals hate eating leaves',
    'Only producers capture sunlight to make food energy from scratch',
    'Consumers are too heavy',
    'Producers live longer than rocks'
  ], 1, 'Photosynthetic producers convert solar energy into chemical food energy for the whole web.'),
  q('sc6b-14', 'G6', 'biology', 'Which part of a flower catches sticky pollen grains during pollination?', [
    'Root cap', 'Stigma', 'Sepal', 'Stem bark'
  ], 1, 'Pollen lands on the sticky stigma at the tip of the female carpel.'),
  q('sc6b-15', 'G6', 'biology', 'Which condition is NOT required for typical bean seed germination?', [
    'Water', 'Warmth (suitable temperature)', 'Oxygen', 'Fertile mineral fertilizer on day 1'
  ], 3, 'Seeds carry stored food reserves; they need water, oxygen, and suitable warmth to sprout.'),
  q('sc6b-16', 'G6', 'biology', 'Which blood cells carry oxygen from lungs to body tissues?', [
    'White blood cells', 'Red blood cells', 'Platelets', 'Nerve cells'
  ], 1, 'Red blood cells contain hemoglobin and lack a nucleus for extra oxygen capacity.'),
  q('sc6b-17', 'G6', 'biology', 'How are cactus spines adapted to desert survival?', [
    'They increase water evaporation',
    'Reduced leaf area cuts water loss and protects water-storing stems from animals',
    'They attract penguins',
    'They trap river floods'
  ], 1, 'Tiny spines minimize transpiration while thick green stems store moisture and photosynthesize.'),
  q('sc6b-18', 'G6', 'biology', 'What selectively controls which substances enter and exit a living cell?', [
    'Cell membrane', 'Vacuole wall', 'Eyepiece', 'Xylem vessel'
  ], 0, 'The partially permeable cell membrane regulates transport into and out of the cell.'),
  q('sc6b-19', 'G6', 'biology', 'In vascular plants, which tubes carry water upward from roots to leaves?', [
    'Phloem', 'Xylem', 'Bronchi', 'Veins with valves'
  ], 1, 'Xylem moves water and dissolved minerals upward; phloem transports sugars.'),
  q('sc6b-20', 'G6', 'biology', 'Which human joint allows swinging motion in almost all directions, such as the shoulder?', [
    'Hinge joint', 'Ball-and-socket joint', 'Fixed suture joint', 'Pivot bone'
  ], 1, 'A rounded bone head fits into a cup-like socket for wide rotation.'),
  q('sc6b-21', 'G6', 'biology', 'If a microscope uses a 10× eyepiece and a 40× objective lens, total magnification is…', [
    '50×', '30×', '400×', '4×'
  ], 2, '10 × 40 = 400×.'),
  q('sc6b-22', 'G6', 'biology', 'Which adaptation helps polar bears retain heat in the Arctic?', [
    'Thin watery fur', 'Thick blubber fat layer and insulating hollow hairs', 'Large floppy ears', 'No winter sleep'
  ], 1, 'Subcutaneous fat and dense fur trap warm air close to the skin.'),
  q('sc6b-23', 'G6', 'biology', 'Animals without a backbone (like crabs, spiders, and worms) are called…', [
    'Mammals', 'Vertebrates', 'Invertebrates', 'Reptiles'
  ], 2, 'Over 95% of animal species are invertebrates lacking a spinal column.'),
  q('sc6b-24', 'G6', 'biology', 'Why do we place pondweed near bright light when measuring oxygen bubbles?', [
    'Stronger light boosts the rate of photosynthesis and O₂ output',
    'Darkness boils water',
    'Fish prefer dark corners',
    'Light melts glass beakers'
  ], 0, 'Higher light intensity increases photosynthetic reaction rate up to a plateau.'),
  q('sc6b-25', 'G6', 'biology', 'What links muscles tightly to bones so limbs can move?', [
    'Cartilage', 'Tendons', 'Villi', 'Stomata'
  ], 1, 'Strong inelastic tendons pull bones when skeletal muscles contract.'),

  // =========================================================
  // Grade 6 Chemistry (25 questions)
  // =========================================================
  q('sc6c-1', 'G6', 'chemistry', 'Best laboratory method to collect pure liquid water from salt water?', [
    'Filtration', 'Distillation', 'Magnet', 'Sieving'
  ], 1, 'Distillation boils water into steam and condenses it back into pure water, leaving salt behind.'),
  q('sc6c-2', 'G6', 'chemistry', 'In which state of matter are particles furthest apart and moving freely at high speed?', [
    'Solid', 'Liquid', 'Gas', 'All states are identical'
  ], 2, 'Gas particles have negligible attraction and zoom freely to fill any container.'),
  q('sc6c-3', 'G6', 'chemistry', 'Insoluble sand mixed with water is best separated by…', [
    'Filtration', 'Evaporation only', 'Dissolving more salt', 'Using a magnet'
  ], 0, 'Filter paper traps solid sand grains while letting liquid water pass through as filtrate.'),
  q('sc6c-4', 'G6', 'chemistry', 'When sugar dissolves completely into warm tea, the sugar is called the…', [
    'Solvent', 'Solute', 'Precipitate', 'Distillate'
  ], 1, 'The solid that dissolves is the solute; the liquid (water/tea) is the solvent.'),
  q('sc6c-5', 'G6', 'chemistry', 'How do particles behave inside a solid metal cube?', [
    'They fly across the room freely',
    'They vibrate closely in fixed orderly positions',
    'They stay completely motionless even when heated',
    'They disappear inside pores'
  ], 1, 'Solid particles are packed tightly in fixed positions and vibrate around them.'),
  q('sc6c-6', 'G6', 'chemistry', 'Which separation method distinguishes different colored dyes inside black felt-tip ink?', [
    'Sieving', 'Paper chromatography', 'Decanting', 'Magnetic sorting'
  ], 1, 'Dyes travel at different speeds with a solvent up paper depending on solubility.'),
  q('sc6c-7', 'G6', 'chemistry', 'Change of state directly from solid dry ice into carbon dioxide gas is called…', [
    'Condensation', 'Sublimation', 'Freezing', 'Filtration'
  ], 1, 'Sublimation skips the liquid phase entirely.'),
  q('sc6c-8', 'G6', 'chemistry', 'What usually helps a solid salt crystal dissolve FASTER in water?', [
    'Using ice-cold water and leaving it still',
    'Warming the water, crushing the crystal, and stirring',
    'Freezing the beaker',
    'Putting a lid on without stirring'
  ], 1, 'Heat speeds particles, crushing increases surface area, and stirring brings fresh solvent into contact.'),
  q('sc6c-9', 'G6', 'chemistry', 'When water droplets appear on the outside of an iced soda can, that process is…', [
    'Evaporation', 'Condensation', 'Boiling', 'Melting'
  ], 1, 'Warm water vapor in air cools on the cold metal and condenses into liquid drops.'),
  q('sc6c-10', 'G6', 'chemistry', 'Which statement accurately describes a SATURATED solution at 25°C?', [
    'No more solute can dissolve in that solvent at 25°C',
    'It holds zero dissolved particles',
    'It is always pure distilled water',
    'It boils at 0°C'
  ], 0, 'At saturation, dissolving and crystallizing reach equilibrium at that temperature.'),
  q('sc6c-11', 'G6', 'chemistry', 'Why can gases be squeezed easily inside a closed syringe whereas liquids and solids cannot?', [
    'Gas particles have huge empty spaces between them',
    'Gas particles shrink to tiny specks under pressure',
    'Liquid particles are made of concrete',
    'Gases weigh more than solids'
  ], 0, 'High compressibility comes from wide gaps between gas molecules.'),
  q('sc6c-12', 'G6', 'chemistry', 'How would you separate iron filings mixed with dry sulfur powder quickly?', [
    'Add cooking oil', 'Move a magnet over the mixture', 'Pass through a coffee filter', 'Boil the mixture'
  ], 1, 'Iron is magnetic while sulfur is not, allowing clean magnetic separation.'),
  q('sc6c-13', 'G6', 'chemistry', 'During melting of pure ice at 0°C while heated gently, the temperature of the ice-water slush…', [
    'Rises steeply to 50°C immediately',
    'Remains steady at 0°C until all ice has melted',
    'Drops to −10°C',
    'Bounces randomly'
  ], 1, 'Added thermal energy goes into breaking solid bonds (latent heat) rather than raising temperature.'),
  q('sc6c-14', 'G6', 'chemistry', 'Which example is a mixture rather than a pure substance?', [
    'Pure distilled water', 'Clean table salt (NaCl)', 'Sea air (nitrogen, oxygen, argon, water vapor)', 'Pure copper wire'
  ], 2, 'Air mixes several gases in variable proportions without chemical bonding.'),
  q('sc6c-15', 'G6', 'chemistry', 'Two immiscible liquids like cooking oil and water in a beaker can be separated using a…', [
    'Separating funnel', 'Bunsen burner alone', 'Magnet', 'Balance scale'
  ], 0, 'Denser water drains cleanly out the bottom tap of a separating funnel before the oil layer.'),
  q('sc6c-16', 'G6', 'chemistry', 'As liquid water evaporates from a puddle on a sunny breeze-filled afternoon, which change happens?', [
    'Fast surface molecules escape into air as water vapor below boiling point',
    'Every drop reaches 100°C simultaneously',
    'Salt molecules fly upward with steam',
    'Particles lock into crystals'
  ], 0, 'Evaporation happens at any temperature from the surface, unlike boiling throughout the liquid.'),
  q('sc6c-17', 'G6', 'chemistry', 'Which gas makes up roughly 78% of Earth’s clean dry atmosphere?', [
    'Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'
  ], 2, 'Air is ~78% nitrogen, ~21% oxygen, and ~1% argon/CO₂/trace gases.'),
  q('sc6c-18', 'G6', 'chemistry', 'Why does a sealed hot air balloon rise when its internal air is warmed?', [
    'Warm air expands, becomes less dense than cooler outside air, and floats upward',
    'Heating turns gas into helium',
    'Cloth becomes magnetic',
    'Gravity shuts off at noon'
  ], 0, 'Thermal expansion lowers air density inside the envelope.'),
  q('sc6c-19', 'G6', 'chemistry', 'You open a bottle of perfume in one corner of a room and soon smell it across the room due to…', [
    'Distillation', 'Diffusion', 'Filtration', 'Freezing'
  ], 1, 'Diffusion spreads gas particles randomly from higher concentration to lower concentration.'),
  q('sc6c-20', 'G6', 'chemistry', 'When salt water evaporates completely in an open dish under the sun, what stays in the dish?', [
    'Only water vapor', 'White salt crystals', 'Nothing at all', 'Liquid oil'
  ], 1, 'Water turns to vapor while solid salt (higher boiling point) crystallizes behind.'),
  q('sc6c-21', 'G6', 'chemistry', 'Which apparatus measures liquid volume accurately in a chemistry lab?', [
    'Graduated (measuring) cylinder', 'Meter stick', 'Triple-beam balance', 'Wire gauze'
  ], 0, 'Read the bottom of the curved liquid meniscus at eye level in a measuring cylinder.'),
  q('sc6c-22', 'G6', 'chemistry', 'In a reversible physical change such as melting wax, what stays unchanged?', [
    'The shape of the solid block', 'The chemical identity and total mass of the substance', 'Whether it can flow', 'Its particle spacing'
  ], 1, 'No new substance forms and total mass is conserved.'),
  q('sc6c-23', 'G6', 'chemistry', 'What hazard symbol warns that a liquid acid can destroy skin tissue and eat into metal?', [
    'Flammable flame', 'Corrosive (test tubes dripping onto hand and surface)', 'Explosive', 'Compressed gas'
  ], 1, 'Corrosive chemicals demand safety goggles and careful handling.'),
  q('sc6c-24', 'G6', 'chemistry', 'If 10 g of sugar dissolves cleanly in 90 g of water, what is the total mass of the sugar solution?', [
    '80 g', '90 g', '100 g', '110 g'
  ], 2, 'Mass is conserved on dissolving: 10 g + 90 g = 100 g.'),
  q('sc6c-25', 'G6', 'chemistry', 'Why does crushed chalk dust react or mix faster than a solid chalk stick?', [
    'Crushing changes chalk into salt',
    'Smaller pieces expose much more total surface area to water',
    'Chalk dust weighs less per gram',
    'Dust freezes instantly'
  ], 1, 'Greater exposed surface area speeds up contact with surrounding molecules.'),

  // =========================================================
  // Grade 7 Physics (25 questions)
  // =========================================================
  q('sc7p-1', 'G7', 'physics', 'In a parallel circuit with two bulbs, one bulb breaks. The other bulb…', [
    'Goes out too', 'Stays lit normally', 'Explodes immediately', 'Gets half as bright'
  ], 1, 'Each parallel branch has its own complete loop to the power source at full voltage.'),
  q('sc7p-2', 'G7', 'physics', 'A car travels 120 km in 2 hours. What is its average speed?', [
    '240 km/h', '60 km/h', '120 km/h', '30 km/h'
  ], 1, 'Speed = distance ÷ time = 120 ÷ 2 = 60 km/h.'),
  q('sc7p-3', 'G7', 'physics', 'Sound waves cannot travel through…', [
    'Liquid water', 'Solid steel rails', 'Classroom air', 'A complete vacuum (outer space)'
  ], 3, 'Sound is a mechanical vibration needing particles to bump into one another.'),
  q('sc7p-4', 'G7', 'physics', 'According to the Law of Reflection, when a light ray hits a flat mirror at an incidence angle of 35°, the angle of reflection is…', [
    '55°', '35°', '70°', '90°'
  ], 1, 'Angle of reflection always equals angle of incidence measured from the normal.'),
  q('sc7p-5', 'G7', 'physics', 'As light passes from air obliquely into denser glass, the light ray bends…', [
    'Away from the normal', 'Toward the normal', 'Straight backward', 'In tight circles'
  ], 1, 'Slowing down in an optically denser medium refracts the ray toward the normal.'),
  q('sc7p-6', 'G7', 'physics', 'Which useful energy conversion takes place inside a solar photovoltaic panel?', [
    'Electrical → Chemical', 'Light (solar) → Electrical', 'Thermal → Nuclear', 'Sound → Kinetic'
  ], 1, 'Solar cells convert incoming light photons directly into electric current.'),
  q('sc7p-7', 'G7', 'physics', 'How should an ammeter be connected to measure current flowing through a lamp?', [
    'In series with the lamp', 'In parallel across the battery only', 'Disconnected on the bench', 'Without wires'
  ], 0, 'An ammeter must sit in series so the exact current passes through it.'),
  q('sc7p-8', 'G7', 'physics', 'What determines the PITCH (high vs. low tone) of a musical sound wave?', [
    'Amplitude (wave height)', 'Frequency (vibrations per second in Hertz)', 'Speed in glass', 'Echo delay'
  ], 1, 'Higher frequency produces higher pitch; larger amplitude makes the sound louder.'),
  q('sc7p-9', 'G7', 'physics', 'If 500 J of chemical energy enters a flashlight and 100 J becomes useful light (400 J heat), its efficiency is…', [
    '80%', '20%', '25%', '50%'
  ], 1, 'Efficiency = (useful output ÷ total input) × 100% = (100 ÷ 500) × 100% = 20%.'),
  q('sc7p-10', 'G7', 'physics', 'Which statement accurately describes the Law of Conservation of Energy?', [
    'Energy is destroyed whenever a car brakes',
    'Energy cannot be created or destroyed, only transferred or transformed between stores',
    'Only kinetic energy exists',
    'Heat energy has negative joules'
  ], 1, 'Total energy in an isolated system stays constant across every transformation.'),
  q('sc7p-11', 'G7', 'physics', 'Why does copper wiring inside home appliances use a plastic outer coating?', [
    'Plastic conducts current faster than copper',
    'Plastic is an electrical insulator that protects users from shock and short circuits',
    'Plastic creates battery voltage',
    'Copper would evaporate without plastic'
  ], 1, 'Copper conducts electrons freely while flexible plastic insulation keeps current inside the wire.'),
  q('sc7p-12', 'G7', 'physics', 'A white light beam splits into red-through-violet rainbow colors through a glass prism because…', [
    'Prism paint leaks dye',
    'Different wavelengths refract by slightly different amounts (dispersion)',
    'Glass slows all light equally',
    'Violet light cannot enter air'
  ], 1, 'Violet light slows and bends slightly more in glass than red light, separating the spectrum.'),
  q('sc7p-13', 'G7', 'physics', 'When two bulbs are wired in SERIES and a third bulb is added to the same loop, each bulb becomes…', [
    'Brighter', 'Dimmer', 'Unchanged', 'Flashing green'
  ], 1, 'Total resistance increases, so circuit current drops and each bulb gets less voltage.'),
  q('sc7p-14', 'G7', 'physics', 'What does the slope (gradient) of a distance-time graph represent?', [
    'Mass', 'Speed', 'Temperature', 'Electric charge'
  ], 1, 'Gradient = Δdistance / Δtime = speed.'),
  q('sc7p-15', 'G7', 'physics', 'In vacuum/air vs. underwater, how does the speed of sound compare with the speed of light?', [
    'Sound travels faster than light',
    'Light (~3×10⁸ m/s) travels almost a million times faster than sound (~340 m/s in air)',
    'They move at equal speed',
    'Light cannot pass through air'
  ], 1, 'That is why we see distant lightning before hearing thunder.'),
  q('sc7p-16', 'G7', 'physics', 'Which thermal transfer method carries heat from the Sun across empty space to Earth?', [
    'Conduction', 'Convection', 'Infrared radiation', 'Evaporation'
  ], 2, 'Thermal radiation travels as electromagnetic waves without needing any medium.'),
  q('sc7p-17', 'G7', 'physics', 'Why are saucepan handles often made of wood or hard plastic while the pan base is metal?', [
    'Metal conducts heat rapidly to food; wood/plastic insulates hands from burns',
    'Plastic reflects sound waves',
    'Wood attracts magnets',
    'Metal blocks heat from cooking food'
  ], 0, 'Good thermal conductors heat evenly, while thermal insulators protect fingers.'),
  q('sc7p-18', 'G7', 'physics', 'A green leaf looks green under white sunlight because the leaf…', [
    'Absorbs green and reflects red only',
    'Reflects green light while absorbing most red and blue wavelengths',
    'Glows with its own battery',
    'Turns green photons into sound'
  ], 1, 'Opaque objects appear the color of wavelengths they reflect to our eyes.'),
  q('sc7p-19', 'G7', 'physics', 'What does a voltmeter measure in a circuit, and how is it wired?', [
    'Current in amps, wired in series',
    'Potential difference in volts, wired in parallel across a component',
    'Resistance in watts, wired outside the battery',
    'Mass of wires in grams'
  ], 1, 'Voltmeters measure energy per unit charge across two points in parallel.'),
  q('sc7p-20', 'G7', 'physics', 'Which wave type has particle vibrations PERPENDICULAR to the direction of wave travel (like light or water ripples)?', [
    'Transverse wave', 'Longitudinal wave', 'Standing thermal wave', 'Static magnetic field'
  ], 0, 'Light is transverse; sound in air is longitudinal (vibrations parallel to travel).'),
  q('sc7p-21', 'G7', 'physics', 'Why does hot air rise above a radiator, setting up a circular room current?', [
    'Convection: warmed air expands, becomes less dense, and rises as cooler denser air sinks to replace it',
    'Conduction turns air solid',
    'Radiation pushes air downward',
    'Gravity avoids radiators'
  ], 0, 'Convection transfers thermal energy by bulk fluid movement in liquids and gases.'),
  q('sc7p-22', 'G7', 'physics', 'If an electric circuit reads current I = 2 A and voltage V = 6 V across a resistor, its resistance R (V = IR) is…', [
    '12 Ω', '3 Ω', '4 Ω', '0.33 Ω'
  ], 1, 'R = V ÷ I = 6 ÷ 2 = 3 Ω.'),
  q('sc7p-23', 'G7', 'physics', 'A hiker shouts toward a cliff 340 m away and hears an echo 2.0 s later. Speed of sound =', [
    '170 m/s', '340 m/s', '680 m/s', '85 m/s'
  ], 1, 'Round-trip distance = 2 × 340 = 680 m; 680 ÷ 2.0 s = 340 m/s.'),
  q('sc7p-24', 'G7', 'physics', 'Which image does a flat bathroom mirror form?', [
    'Upside-down real image on a screen', 'Upright virtual image, same size, laterally inverted behind the mirror', 'Tiny curved image twice as bright', 'Only black-and-white silhouettes'
  ], 1, 'Plane mirrors form virtual upright images at equal distance behind the glass.'),
  q('sc7p-25', 'G7', 'physics', 'How do shiny silver foil emergency blankets help keep stranded hikers warm?', [
    'They generate electricity from snow',
    'Shiny surfaces reflect body heat (infrared radiation) back inward and block wind convection',
    'Silver conducts frost into skin',
    'They make hikers heavier'
  ], 1, 'Poor emitters/good reflectors cut radiative and convective heat loss.'),

  // =========================================================
  // Grade 7 Biology (25 questions)
  // =========================================================
  q('sc7b-1', 'G7', 'biology', 'Aerobic cellular respiration inside mitochondria reacts glucose with…', [
    'Carbon dioxide', 'Oxygen', 'Sunlight', 'Nitrogen'
  ], 1, 'Glucose + oxygen → carbon dioxide + water (+ ATP energy).'),
  q('sc7b-2', 'G7', 'biology', 'Which muscular organ pumps oxygenated and deoxygenated blood around the human body?', [
    'Lungs', 'Heart', 'Liver', 'Kidney'
  ], 1, 'The four-chambered heart drives blood through pulmonary and systemic loops.'),
  q('sc7b-3', 'G7', 'biology', 'In an ecological pyramid of energy, where is the LARGEST amount of energy stored?', [
    'Top predators', 'Producers (plants / phytoplankton)', 'Secondary consumers', 'Scavengers'
  ], 1, 'Only roughly 10% of energy transfers up each trophic level; ~90% is lost via respiration and heat.'),
  q('sc7b-4', 'G7', 'biology', 'During strenuous sprinting when muscles run short on oxygen, anaerobic respiration in humans produces…', [
    'Lactic acid (causing muscle fatigue)', 'Pure ethanol gas', 'Chlorophyll', 'Solid salt'
  ], 0, 'Anaerobic breakdown yields less energy quickly and leaves lactic acid to clear later.'),
  q('sc7b-5', 'G7', 'biology', 'Inside human lungs, where does gas exchange between inhaled air and blood capillaries occur?', [
    'Trachea cartilage rings', 'Alveoli (tiny thin-walled air sacs)', 'Nasal hairs', 'Diaphragm muscle'
  ], 1, 'Millions of moist, one-cell-thick alveoli maximize surface area for O₂ and CO₂ diffusion.'),
  q('sc7b-6', 'G7', 'biology', 'When you inhale, what do your diaphragm and ribcage do?', [
    'Diaphragm contracts (flattens) and ribs lift up/outward, increasing chest volume and lowering pressure',
    'Diaphragm relaxes upward and ribs drop down',
    'Heart stops beating briefly',
    'Alveoli close shut'
  ], 0, 'Larger thoracic volume drops lung air pressure below atmospheric pressure, drawing air in.'),
  q('sc7b-7', 'G7', 'biology', 'Why do arteries have thick, elastic muscular walls compared with veins?', [
    'Arteries carry blood under high pressure pumped directly from the heart',
    'Arteries contain valves along their whole length',
    'Arteries only hold water',
    'Veins beat faster than the heart'
  ], 0, 'Thick walls withstand pressure surges while veins carry low-pressure blood using one-way valves.'),
  q('sc7b-8', 'G7', 'biology', 'What prevents backflow of blood in veins and between heart chambers?', [
    'Stomata', 'One-way valves', 'White blood cells', 'Ribs'
  ], 1, 'Valves snap shut if blood starts flowing backward.'),
  q('sc7b-9', 'G7', 'biology', 'Which blood component forms clots to seal cuts and stop pathogens entering?', [
    'Red blood cells', 'Platelets', 'Plasma salt alone', 'Bronchioles'
  ], 1, 'Platelet fragments trigger fibrin webs that form protective scabs.'),
  q('sc7b-10', 'G7', 'biology', 'How does anaerobic respiration in yeast benefit bread baking?', [
    'It produces lactic acid that turns dough blue',
    'Carbon dioxide gas bubbles expand inside dough and make bread light and fluffy',
    'It removes all starch',
    'It freezes yeast cells'
  ], 1, 'Yeast ferments sugar into CO₂ and ethanol (which evaporates during baking).'),
  q('sc7b-11', 'G7', 'biology', 'Which human digestive enzyme starts breaking starch into maltose inside the mouth?', [
    'Lipase', 'Amylase (in saliva)', 'Protease', 'Hydrochloric acid'
  ], 1, 'Salivary amylase begins chemical digestion of starch before swallowing.'),
  q('sc7b-12', 'G7', 'biology', 'Why is the inner wall of the small intestine folded into millions of tiny villi?', [
    'To store solid stones',
    'To maximize surface area for absorbing digested nutrients into blood',
    'To digest oxygen gas',
    'To create lactic acid'
  ], 1, 'Thin microvilli with dense capillary beds speed nutrient diffusion into circulation.'),
  q('sc7b-13', 'G7', 'biology', 'What does bile (made in the liver) do to dietary fats before lipase digests them?', [
    'Turns fat into starch',
    'Emulsifies large fat globs into tiny droplets to enlarge surface area for lipase',
    'Dissolves bone calcium',
    'Neutralizes oxygen'
  ], 1, 'Emulsification lets water-soluble lipase enzymes attack fat molecules much faster.'),
  q('sc7b-14', 'G7', 'biology', 'Which statement differentiates biotic and abiotic factors in a pond ecosystem?', [
    'Water pH and sunlight are biotic; frogs and pondweed are abiotic',
    'Frogs, algae, and bacteria are biotic (living); temperature, light, and pH are abiotic (non-living)',
    'Both terms mean only dead rocks',
    'Sunlight is a producer'
  ], 1, 'Biotic covers living organisms and interactions; abiotic covers physical/chemical environment.'),
  q('sc7b-15', 'G7', 'biology', 'In carbon cycling, what two processes move carbon between air CO₂ and living organisms in opposite directions?', [
    'Evaporation and freezing',
    'Photosynthesis (absorbs CO₂) and respiration/combustion (releases CO₂)',
    'Distillation and diffusion',
    'Filtration and magnetism'
  ], 1, 'Plants fix atmospheric CO₂; organisms and burning fossil fuels return CO₂.'),
  q('sc7b-16', 'G7', 'biology', 'When two species or individuals need the exact same limited food or nesting space, this interaction is…', [
    'Photosynthesis', 'Competition', 'Neutralization', 'Sublimation'
  ], 1, 'Competition shapes population sizes and leads species to specialize in distinct niches.'),
  q('sc7b-17', 'G7', 'biology', 'Why can bioaccumulation of mercury or pesticides harm top predators like eagles most?', [
    'Predators drink ocean salt directly',
    'Persistent toxins concentrate upward along each step of the food chain (biomagnification)',
    'Eagles breathe CO₂',
    'Decomposers spray poison at trees'
  ], 1, 'Non-excreted toxins stored in prey tissue accumulate to dangerous levels in top carnivores.'),
  q('sc7b-18', 'G7', 'biology', 'Which term describes differences in inherited traits (like beak shape) among individuals in a population?', [
    'Photosynthesis', 'Genetic variation', 'Neutralization', 'Condensation'
  ], 1, 'Variation gives populations traits that may favor survival when environments change.'),
  q('sc7b-19', 'G7', 'biology', 'Under natural selection, individuals better suited to their environment tend to…', [
    'Survive, reproduce more successfully, and pass helpful traits to offspring',
    'Change their DNA consciously overnight',
    'Live without water',
    'Become identical clones instantly'
  ], 0, 'Differential survival and reproduction gradually adapt populations over generations.'),
  q('sc7b-20', 'G7', 'biology', 'How does limewater show that exhaled breath contains more carbon dioxide than inhaled air?', [
    'Limewater turns bright orange',
    'Clear limewater turns milky/cloudy faster when exhaled air bubbles through it',
    'Limewater freezes solid',
    'Limewater catches fire'
  ], 1, 'CO₂ reacts with calcium hydroxide solution to form insoluble white calcium carbonate.'),
  q('sc7b-21', 'G7', 'biology', 'Why does vigorous exercise increase both your breathing rate AND your heart rate?', [
    'To deliver more oxygen and glucose to muscles and clear CO₂ faster',
    'To cool down bones to 0°C',
    'To switch lungs off during running',
    'To store extra nitrogen in blood'
  ], 0, 'Active muscle cells require higher aerobic respiration rates.'),
  q('sc7b-22', 'G7', 'biology', 'In dichotomous classification keys, each step gives…', [
    'Five vague opinions',
    'A pair of contrasting yes/no observable questions leading step by step to an organism’s identity',
    'Historical dates of birth',
    'Chemical formulas only'
  ], 1, 'Observable structural traits split choices cleanly at every branch.'),
  q('sc7b-23', 'G7', 'biology', 'Which type of cell has a long axon and branched endings to transmit fast electrical signals?', [
    'Ciliated epithelial cell', 'Nerve cell (neuron)', 'Root hair cell', 'Palisade leaf cell'
  ], 1, 'Neurons are specialized for rapid signal transmission across the nervous system.'),
  q('sc7b-24', 'G7', 'biology', 'Why do palisade mesophyll cells near the top surface of a leaf pack so many chloroplasts?', [
    'To trap maximum sunlight passing through the upper epidermis',
    'To block rain from falling',
    'To absorb mud from wind',
    'To pump water down to roots'
  ], 0, 'Top-side placement and tall shape maximize light absorption for photosynthesis.'),
  q('sc7b-25', 'G7', 'biology', 'Which microorganism group is used in making yogurt from milk by fermenting lactose into lactic acid?', [
    'Viruses', 'Helpful Lactobacillus bacteria', 'Mosses', 'Algae'
  ], 1, 'Lactic acid thickens milk proteins and gives yogurt its tangy taste.'),

  // =========================================================
  // Grade 7 Chemistry (25 questions)
  // =========================================================
  q('sc7c-1', 'G7', 'chemistry', 'Acid + alkali reacts in neutralization to produce…', [
    'Hydrogen + oxygen', 'Salt + water', 'CO₂ + glucose', 'Pure metal + gas'
  ], 1, 'For example: hydrochloric acid + sodium hydroxide → sodium chloride + water.'),
  q('sc7c-2', 'G7', 'chemistry', 'Which everyday process is a CHEMICAL change?', [
    'Ice cubes melting', 'Paper burning into ash and smoke', 'Sugar dissolving in coffee', 'A glass bottle shattering'
  ], 1, 'Burning forms brand-new chemical substances and cannot be reversed simply.'),
  q('sc7c-3', 'G7', 'chemistry', 'An aqueous solution with pH 2 is…', [
    'Strongly acidic', 'Neutral', 'Weakly alkaline', 'Strongly alkaline'
  ], 0, 'pH < 7 is acidic; pH 7 is neutral; pH > 7 is alkaline (basic).'),
  q('sc7c-4', 'G7', 'chemistry', 'When magnesium ribbon reacts with hydrochloric acid, what gas bubbles off and makes a "squeaky pop" with a lit splint?', [
    'Oxygen', 'Hydrogen', 'Carbon dioxide', 'Nitrogen'
  ], 1, 'Acid + reactive metal → salt + hydrogen gas.'),
  q('sc7c-5', 'G7', 'chemistry', 'When marble chips (calcium carbonate) react with acid, which gas turns limewater milky?', [
    'Hydrogen', 'Oxygen', 'Carbon dioxide', 'Helium'
  ], 2, 'Acid + carbonate → salt + water + carbon dioxide.'),
  q('sc7c-6', 'G7', 'chemistry', 'What color does Universal Indicator turn in pure neutral water (pH 7)?', [
    'Deep red', 'Green', 'Dark purple', 'Bright pink'
  ], 1, 'Red = strong acid, orange/yellow = weak acid, green = pH 7 neutral, blue/purple = alkali.'),
  q('sc7c-7', 'G7', 'chemistry', 'On the Periodic Table, vertical columns of elements with similar chemical properties are called…', [
    'Periods', 'Groups', 'Alloys', 'Compounds'
  ], 1, 'Horizontal rows are periods; vertical columns are groups (e.g., Group 1 alkali metals).'),
  q('sc7c-8', 'G7', 'chemistry', 'What is a COMPOUND compared with a mixture?', [
    'Two or more elements chemically bonded together in fixed proportions',
    'Anything stirred in a cup',
    'A single element cooled down',
    'Substances separable easily with a sieve'
  ], 0, 'Compounds (like H₂O or FeS) have brand-new properties different from their constituent elements.'),
  q('sc7c-9', 'G7', 'chemistry', 'Which chemical symbol represents Sodium on the Periodic Table?', [
    'So', 'Sd', 'Na', 'S'
  ], 2, 'Sodium’s symbol "Na" comes from its Latin name natrium.'),
  q('sc7c-10', 'G7', 'chemistry', 'If a wasp sting is slightly alkaline, why might dabbing weak vinegar (acid) soothe the sting?', [
    'Neutralization gently brings the pH closer to neutral 7',
    'Vinegar freezes nerves solid',
    'Vinegar increases alkalinity',
    'Vinegar coats skin in iron'
  ], 0, 'Mild acid counteracts an alkaline sting via neutralization.'),
  q('sc7c-11', 'G7', 'chemistry', 'In a closed flask, 12 g of magnesium reacts with oxygen to form 20 g of magnesium oxide. What mass of oxygen combined?', [
    '32 g', '8 g', '12 g', '2 g'
  ], 1, 'Conservation of mass: mass of oxygen = 20 g − 12 g = 8 g.'),
  q('sc7c-12', 'G7', 'chemistry', 'Why do copper electrical wires NOT turn into iron inside a lamp, even though both are metals?', [
    'Chemical reactions rearrange existing atoms—they do not turn one element’s atoms into another',
    'Copper has no atoms',
    'Lamp voltage cools copper into sulfur',
    'Iron is a gas at room temperature'
  ], 0, 'Each element consists of atoms with a characteristic number of protons.'),
  q('sc7c-13', 'G7', 'chemistry', 'Which property is typical of METALS rather than non-metals?', [
    'Brittle dull solids that break when hammered',
    'Malleable, shiny when polished, and good conductors of heat and electricity',
    'Low-density gases at 20°C',
    'Insulators of electric current'
  ], 1, 'Metallic bonding allows atoms to slide (malleable/ductile) and free electrons to conduct.'),
  q('sc7c-14', 'G7', 'chemistry', 'When sodium (Group 1 metal) reacts with water, the solution turns Universal Indicator purple because…', [
    'A strong acid forms', 'Alkaline sodium hydroxide forms alongside hydrogen gas', 'Water freezes', 'Oxygen gas turns blue'
  ], 1, 'Alkali metals react vigorously with water to produce alkaline hydroxides.'),
  q('sc7c-15', 'G7', 'chemistry', 'In the word equation: Iron + Sulfur → Iron Sulfide, what are the REACTANTS?', [
    'Iron Sulfide only', 'Iron and Sulfur', 'Oxygen and Iron', 'Water and Iron Sulfide'
  ], 1, 'Starting substances on the left of the arrow are reactants; new ones on the right are products.'),
  q('sc7c-16', 'G7', 'chemistry', 'Which three things are needed for ordinary fire (the Fire Triangle)?', [
    'Fuel, heat, and oxygen', 'Water, nitrogen, and fuel', 'Carbon dioxide, iron, and spark', 'Acid, alkali, and salt'
  ], 0, 'Extinguishers work by removing heat (water), oxygen (CO₂/foam), or fuel.'),
  q('sc7c-17', 'G7', 'chemistry', 'Why do Noble Gases (Group 0 / Group 18, like helium and neon) rarely react with other elements?', [
    'They exist only below −200°C',
    'Their outer electron shells are already full and stable',
    'They contain zero protons',
    'They dissolve instantly in nitrogen'
  ], 1, 'Stable full valence shells make noble gases chemically inert.'),
  q('sc7c-18', 'G7', 'chemistry', 'Why does coating iron bicycle frames with paint or zinc prevent rusting?', [
    'It blocks oxygen and water from touching the iron surface',
    'Paint heats the iron past 500°C',
    'Zinc turns water into pure air',
    'Paint removes iron atoms'
  ], 0, 'Iron rusting requires both oxygen and water.'),
  q('sc7c-19', 'G7', 'chemistry', 'In an EXOTHERMIC chemical reaction (such as hand warmers or combustion), the surrounding temperature…', [
    'Drops sharply', 'Rises as heat energy is released to surroundings', 'Stays frozen at 0°C', 'Turns into light only without heat'
  ], 1, '"Exo-" = exiting heat out into the surroundings; endothermic reactions absorb heat and feel cold.'),
  q('sc7c-20', 'G7', 'chemistry', 'Which test identifies pure OXYGEN gas in the lab?', [
    'A glowing wooden splint bursts back into bright flame',
    'A lit splint makes a squeaky pop',
    'Limewater turns cloudy',
    'Damp litmus turns blue then vanishes'
  ], 0, 'Oxygen supports combustion vigorously and relights a glowing splint.'),
  q('sc7c-21', 'G7', 'chemistry', 'How many total atoms are shown in the chemical formula CaCO₃?', [
    '3', '4', '5', '6'
  ], 2, '1 Calcium (Ca) + 1 Carbon (C) + 3 Oxygen (O) = 5 atoms.'),
  q('sc7c-22', 'G7', 'chemistry', 'In a displacement reaction, zinc drops into blue copper sulfate solution and turns the liquid colorless while reddish copper forms. Why?', [
    'Zinc is more reactive than copper and pushes copper out of its compound',
    'Copper boils away',
    'Zinc melts into glass',
    'Water creates new copper'
  ], 0, 'A more reactive metal displaces a less reactive metal from its salt solution.'),
  q('sc7c-23', 'G7', 'chemistry', 'Farmers sometimes spread powdered limestone (a weak base) on overly acidic farmland soil to…', [
    'Freeze weeds', 'Raise soil pH toward neutral so crops absorb nutrients well', 'Add plastic dust', 'Increase acid rain'
  ], 1, 'Liming soil neutralizes excess acidity harmful to roots and soil microbes.'),
  q('sc7c-24', 'G7', 'chemistry', 'Which indicator turns red in acid and blue in alkali?', [
    'Phenolphthalein', 'Litmus paper', 'Iodine solution', 'Cobalt chloride paper'
  ], 1, 'Blue litmus turns red in acid; red litmus turns blue in alkali.'),
  q('sc7c-25', 'G7', 'chemistry', 'What makes steel harder and stronger than pure soft iron?', [
    'Pure iron has fewer atoms per gram',
    'Steel is an alloy adding small amounts of carbon whose different-sized atoms stop iron layers sliding easily',
    'Steel contains zero iron',
    'Steel is frozen oxygen'
  ], 1, 'Disrupting regular metallic crystal layers increases strength and hardness in alloys.')
];
