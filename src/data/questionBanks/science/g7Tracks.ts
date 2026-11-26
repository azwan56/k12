import type { GradeLevel, PracticeQuestion } from '../../k12Subjects';

const q = (
  id: string,
  grade: GradeLevel,
  track: string | undefined,
  question: string,
  options: string[],
  answer: number,
  explanation: string
): PracticeQuestion => ({ id, grade, track, question, options, answer, explanation });

export const SCIENCE_G7_TRACKS: PracticeQuestion[] = [
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
