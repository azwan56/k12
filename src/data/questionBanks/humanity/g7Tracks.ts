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

export const HUMANITY_G7_TRACKS: PracticeQuestion[] = [
  // --- Grade 7 History (32 questions) ---
  q('hu7h-1', 'G7', 'history', 'Besides silk and spices, what did the Silk Road spread across Eurasia?', [
    'Nothing else', 'Ideas, religions like Buddhism, and technologies such as papermaking', 'Only soldiers', 'Only silver coins'
  ], 1, 'Merchants, monks, and envoys carried technologies, crops, art, and beliefs along overland routes.'),
  q('hu7h-2', 'G7', 'history', 'The European Renaissance began in which country during the 14th century?', [
    'England', 'Italy', 'China', 'Egypt'
  ], 1, 'Wealthy Italian trading cities like Florence and Venice funded Renaissance art and scholarship.'),
  q('hu7h-3', 'G7', 'history', 'Under European feudalism, who granted land (fiefs) to knights in return for military service?', [
    'Peasants', 'Lords and nobles', 'Guild apprentices', 'Sailors'
  ], 1, 'Feudal ties exchanged land protection from lords for loyalty and military duty from vassals.'),
  q('hu7h-4', 'G7', 'history', 'Which invention refined by Gutenberg (c. 1450) dramatically sped up the spread of Renaissance ideas?', [
    'The magnetic compass', 'The movable-type printing press', 'The barometer', 'The steam turbine'
  ], 1, 'Printing made books affordable and allowed ideas to circulate quickly across Europe.'),
  q('hu7h-5', 'G7', 'history', 'The Black Death (1340s) was transmitted along Eurasian trade routes mainly via…', [
    'Contaminated rainwater', 'Fleas carried by black rats', 'Volcanic dust', 'Solar eclipses'
  ], 1, 'Merchant ships and caravans unintentionally carried plague-infected fleas and rodents.'),
  q('hu7h-6', 'G7', 'history', 'Who commanded the Ming Dynasty treasure fleets (1405–1433) reaching Southeast Asia, India, and East Africa?', [
    'Marco Polo', 'Zheng He', 'Ferdinand Magellan', 'Zhang Qian'
  ], 1, 'Admiral Zheng He led seven monumental maritime expeditions across the Indian Ocean.'),
  q('hu7h-7', 'G7', 'history', 'A historian discovers a soldier’s 1415 diary. Its main limitation when reconstructing the battle is that…', [
    'Paper from 1415 is always fake',
    'It captures only one person’s limited perspective and possible bias',
    'Diaries count as modern secondary sources',
    'Dates did not exist in the 1400s'
  ], 1, 'Cross-checking multiple primary sources corrects individual blind spots or exaggeration.'),
  q('hu7h-8', 'G7', 'history', 'Which 1215 English charter established that even the king must obey the law?', [
    'The Treaty of Versailles', 'Magna Carta', 'The Domesday Book', 'The Petition of Right'
  ], 1, 'English barons forced King John to seal Magna Carta, limiting arbitrary royal taxation and arrest.'),
  q('hu7h-9', 'G7', 'history', 'Why did Renaissance thinkers call their cultural outlook "Humanism"?', [
    'They rejected all science and math',
    'They studied classical Greek and Roman texts and celebrated human reason and potential',
    'They banned painting portraits',
    'They only wrote about animals'
  ], 1, 'Humanists looked to antiquity and earthly observation rather than solely medieval theology.'),
  q('hu7h-10', 'G7', 'history', 'During the Tang and Song dynasties in China, civil service exams selected officials primarily based on…', [
    'Noble birth alone', 'Merit demonstrated through literary and Confucian scholarship', 'Height and weightlifting', 'Auction bids'
  ], 1, 'The imperial examination system opened government service to educated talent beyond hereditary nobles.'),
  q('hu7h-11', 'G7', 'history', 'What major medical & scholarly center thrived in 9th-century Baghdad during the Islamic Golden Age?', [
    'Library of Alexandria', 'House of Wisdom (Bayt al-Hikma)', 'Acropolis Academy', 'Palace of Versailles'
  ], 1, 'Scholars at Baghdad’s House of Wisdom translated, preserved, and expanded Greek, Persian, and Indian science.'),
  q('hu7h-12', 'G7', 'history', 'Why did the Song Dynasty introduce "Jiaozi", the world’s earliest government-issued paper money?', [
    'Gold mines disappeared completely',
    'Growing trade made heavy strings of copper/iron coins inconvenient to haul',
    'Artists needed paper posters',
    'Foreign invaders outlawed silver'
  ], 1, 'Light promissory notes supported booming commercial markets and long-distance merchants.'),
  q('hu7h-13', 'G7', 'history', 'What was the Columbian Exchange following 1492 voyages?', [
    'A stock market in London',
    'The widespread transfer of plants, animals, people, ideas, and diseases between the Americas and Afro-Eurasia',
    'A peace treaty between France and Spain',
    'An ancient Greek Olympic event'
  ], 1, 'Crops like potatoes and maize transformed Old World diets, while Old World diseases devastated Indigenous Americans.'),
  q('hu7h-14', 'G7', 'history', 'How did linear perspective change Renaissance painting?', [
    'All backgrounds had to be painted gold leaf',
    'It created the illusion of three-dimensional depth on a flat canvas',
    'Only geometric triangles could be painted',
    'Oil paint became illegal'
  ], 1, 'Artists like Brunelleschi and da Vinci used vanishing points to depict realistic space.'),
  q('hu7h-15', 'G7', 'history', 'What invention by Song artisan Bi Sheng improved printing around 1040 CE?', [
    'Steamboat paddles', 'Movable clay type blocks', 'Photography film', 'Electric telegraph'
  ], 1, 'Reusable movable characters could be rearranged for different pages without carving an entire new woodblock.'),
  q('hu7h-16', 'G7', 'history', 'What role did Mansa Musa’s 1324 pilgrimage from Mali play in medieval Africa and the Mediterranean world?', [
    'It ended Mali’s gold mines',
    'It showcased Mali’s immense wealth and linked Timbuktu to Islamic scholarship',
    'It started the Hundred Years’ War',
    'It moved the Sahara desert south'
  ], 1, 'Mali’s gold and scholars turned Timbuktu into a renowned hub of universities and manuscript libraries.'),
  q('hu7h-17', 'G7', 'history', 'In medieval Europe, what were merchant and craft guilds?', [
    'Traveling circuses',
    'Associations that regulated quality, prices, wages, and apprentice training in towns',
    'Royal naval fleets',
    'Feudal castles for kings'
  ], 1, 'Guilds protected craft standards and trained apprentices into journeymen and masters.'),
  q('hu7h-18', 'G7', 'history', 'Why did Martin Luther nail his Ninety-Five Theses in 1517, sparking the Protestant Reformation?', [
    'To propose building new railroads',
    'To criticize church abuses such as selling indulgences',
    'To support flat-earth geography',
    'To abolish universities'
  ], 1, 'Luther’s printed critique challenged papal authority and sparked new Protestant denominations.'),
  q('hu7h-19', 'G7', 'history', 'During the Scientific Revolution, Galileo’s telescope observations supported which model of the solar system?', [
    'Geocentric (Earth at the center)', 'Heliocentric (Sun at the center)', 'Moon at the center', 'No planets orbit'
  ], 1, 'Observing Jupiter’s moons and Venus’s phases backed Copernicus’s Sun-centered model.'),
  q('hu7h-20', 'G7', 'history', 'How did the Mongol Empire’s "Pax Mongolica" affect overland trade across Asia in the 13th–14th centuries?', [
    'It closed every road permanently',
    'Unified imperial postal stations (Yam) and safe routes boosted long-distance trade and travel',
    'Mongols destroyed the Silk Road',
    'Travel was allowed only by submarine'
  ], 1, 'Travelers such as Marco Polo and Ibn Battuta crossed Eurasia along protected relay networks.'),
  q('hu7h-21', 'G7', 'history', 'In Inca civilization in the Andes, what were "quipus" used for?', [
    'Cooking maize soup', 'Recording census numbers and taxes with knotted colored cords', 'Sailing across the Pacific', 'Casting steel swords'
  ], 1, 'Quipu strings encoded numerical records for an empire without a conventional written alphabet.'),
  q('hu7h-22', 'G7', 'history', 'Why did European monarchs sponsor sea voyages around Africa and across the Atlantic in the 1400s–1500s?', [
    'To avoid overland middlemen taxes and reach Asian spice markets directly',
    'To escape mild summers',
    'To mine ice in Antarctica',
    'Because all ships had engines'
  ], 0, 'Ottoman and Venetian control of eastern Mediterranean trade motivated ocean routes to India and Spice Islands.'),
  q('hu7h-23', 'G7', 'history', 'Which Chinese dynasty completed and fortified most of the stone brick Great Wall standing today?', [
    'Shang', 'Ming', 'Tang', 'Han'
  ], 1, 'The Ming Dynasty rebuilt northern defenses with brick, stone watchtowers, and signal beacons.'),
  q('hu7h-24', 'G7', 'history', 'What was "human agency" or the role of cities in late medieval Europe after the Black Death?', [
    'Cities vanished completely',
    'Labor shortages helped surviving peasants and artisans bargain for higher wages and freedoms',
    'Serfdom became ten times stricter everywhere',
    'Coinage was replaced by seashells'
  ], 1, 'Fewer workers made labor more valuable, weakening traditional manorial serfdom in Western Europe.'),
  q('hu7h-25', 'G7', 'history', 'Why is corroboration important when reading two historical chronicles of the same siege?', [
    'It makes the essay look heavier',
    'Comparing independent accounts reveals where sources agree or exaggerate',
    'Only the longest chronicle is ever honest',
    'Historians erase dates that disagree'
  ], 1, 'Corroboration checks reliability by comparing multiple independent pieces of evidence.'),
  q('hu7h-26', 'G7', 'history', 'Which Asian naval & military innovation did Mongol conquests help transmit westward into Europe?', [
    'Electric batteries', 'Gunpowder weapons', 'Rubber tires', 'Telephones'
  ], 1, 'Gunpowder, first discovered by Chinese alchemists in the Tang/Song eras, transformed medieval siege warfare worldwide.'),
  q('hu7h-27', 'G7', 'history', 'Who argued in the Enlightenment that people possess natural rights to life, liberty, and property—and may replace unjust governments?', [
    'Thomas Hobbes', 'John Locke', 'Louis XIV', 'Cardinal Richelieu'
  ], 1, 'John Locke’s social-contract theory deeply influenced modern constitutional government.'),
  q('hu7h-28', 'G7', 'history', 'What distinguished the Tokugawa Shogunate (1603–1868) in Japan regarding foreign contact?', [
    'Japan colonized South America',
    'Strict maritime restrictions (Sakoku) limited foreign trade mainly to Dutch and Chinese ships at Nagasaki',
    'All samurai became railroad engineers',
    'Japan banned domestic agriculture'
  ], 1, 'The shogunate maintained over two centuries of domestic peace alongside tightly controlled external contact.'),
  q('hu7h-29', 'G7', 'history', 'What economic change accompanied the Industrial Revolution starting in late-1700s Britain?', [
    'Factories returned to hand looms',
    'Water and steam power shifted production from rural cottages to mechanized urban factories',
    'Coal mining stopped altogether',
    'Canals and railways were torn up'
  ], 1, 'Mechanized textile mills, coal, iron, and steam locomotives drastically expanded output and urbanized populations.'),
  q('hu7h-30', 'G7', 'history', 'Which historical term describes evaluating past people’s actions inside the beliefs and knowledge of their own era rather than solely modern standards?', [
    'Plagiarism', 'Historical empathy / contextualization', 'Chronological inversion', 'Cartography'
  ], 1, 'Contextualization helps explain why past societies acted as they did without excusing injustice.'),
  q('hu7h-31', 'G7', 'history', 'How did astrolabes and magnetic compasses aid long-distance ocean navigation?', [
    'They cleared away ocean fog',
    'Sailors could determine latitude from stars/sun and hold a steady compass heading',
    'They doubled ship cargo capacity',
    'They generated fresh drinking water'
  ], 1, 'Improved celestial and magnetic instruments reduced reliance on hugging coastlines.'),
  q('hu7h-32', 'G7', 'history', 'Which source would be considered a SECONDARY source about the Song Dynasty?', [
    'An original Song landscape scroll painted in 1113 CE',
    'Records written by Song official Sima Guang in 1084 CE',
    'A 2023 university history book analyzing Song maritime trade',
    'Excavated Song dynasty porcelain shards from the Nanhai I shipwreck'
  ], 2, 'A modern book interpreting earlier evidence is a secondary source.'),

  // --- Grade 7 Geography (32 questions) ---
  q('hu7g-1', 'G7', 'geography', 'Which is a PULL factor encouraging migration into a growing city?', [
    'Severe drought on rural farms', 'No secondary schools nearby', 'Higher-paying jobs and universities in the city', 'Frequent river flooding'
  ], 2, 'Pull factors attract migrants toward a destination; push factors drive them to leave.'),
  q('hu7g-2', 'G7', 'geography', 'Which terrestrial biome receives the highest annual rainfall and supports peak biodiversity?', [
    'Hot desert', 'Arctic tundra', 'Tropical rainforest', 'Temperate grassland'
  ], 2, 'Warm year-round temperatures and convective rain near the Equator sustain tropical rainforests.'),
  q('hu7g-3', 'G7', 'geography', 'Which energy source is renewable?', ['Bituminous coal', 'Natural gas', 'Solar photovoltaic', 'Crude oil'], 2,
    'Sunlight is naturally replenished continuously unlike fossil fuels.'),
  q('hu7g-4', 'G7', 'geography', 'A population pyramid with a very wide base and narrow peak indicates…', [
    'An aging, shrinking society', 'A high birth rate and large youthful population', 'Equal numbers in every age group', 'Zero migration'
  ], 1, 'A broad bottom tier reflects high fertility and rapid population growth.'),
  q('hu7g-5', 'G7', 'geography', 'Which biome is characterized by treeless landscapes and permanently frozen subsoil (permafrost)?', [
    'Savanna', 'Tundra', 'Mediterranean chaparral', 'Monsoon forest'
  ], 1, 'In the tundra, short cool summers thaw only the very top layer above permafrost.'),
  q('hu7g-6', 'G7', 'geography', 'Very rapid, unplanned urbanization often leads directly to…', [
    'Empty highway networks', 'Traffic congestion and housing shortages', 'Lower demand for clean water', 'Expanding wilderness inside city centers'
  ], 1, 'When population influx outpaces infrastructure, transit, housing, and sanitation come under strain.'),
  q('hu7g-7', 'G7', 'geography', 'Which city is a megacity (metropolitan population over 10 million)?', [
    'Reykjavik', 'Shanghai', 'Oslo', 'Wellington'
  ], 1, 'Shanghai’s metropolitan area is home to well over 24 million residents.'),
  q('hu7g-8', 'G7', 'geography', 'Which daily choice best reflects environmental sustainability?', [
    'Logging timber faster than saplings regrow', 'Expanding electric transit and recycling materials', 'Leaving empty classrooms lit overnight', 'Replacing reusable bottles with single-use plastics'
  ], 1, 'Sustainability meets present needs without depleting resources needed by future generations.'),
  q('hu7g-9', 'G7', 'geography', 'Why do coastal cities generally have milder winter and summer temperature extremes than inland continental cities at the same latitude?', [
    'Oceans reflect all sunlight', 'Water heats up and cools down much more slowly than rock and soil', 'Fish generate warm currents', 'Coastal mountains block the sun'
  ], 1, 'Water’s high specific heat capacity moderates nearby coastal air temperatures.'),
  q('hu7g-10', 'G7', 'geography', 'On the leeward (downwind) side of a tall coastal mountain range, dry conditions often form a…', [
    'Coral reef', 'Rain shadow desert', 'Estuary delta', 'Glacial fjord'
  ], 1, 'Moist air cools and drops rain climbing the windward slope, leaving dry air descending on the leeward side.'),
  q('hu7g-11', 'G7', 'geography', 'What is the main difference between weather and climate?', [
    'Weather happens only at sea; climate happens on land',
    'Weather is short-term daily conditions; climate is the long-term 30-year average pattern',
    'Climate changes hourly while weather never changes',
    'There is no difference between them'
  ], 1, 'A rainy afternoon is weather; dry hot summers over decades define a Mediterranean climate.'),
  q('hu7g-12', 'G7', 'geography', 'Which factor primarily causes Earth’s seasons as our planet orbits the Sun?', [
    'Sunspots flickering each week',
    'Earth’s 23.5° axial tilt changing sunlight angles during orbit',
    'Tides pulling oceans toward Mars',
    'Volcanic eruptions in winter'
  ], 1, 'Earth’s fixed tilt makes one hemisphere lean toward the Sun in June and away in December.'),
  q('hu7g-13', 'G7', 'geography', 'What landform grows where a sediment-rich river slows down as it meets a calm sea?', [
    'V-shaped mountain canyon', 'River delta', 'Atoll', 'Plateau'
  ], 1, 'Dropped silt and sand fan outward into fertile deltas like the Yangtze or Nile deltas.'),
  q('hu7g-14', 'G7', 'geography', 'If a country has a high Birth Rate AND a rapidly falling Death Rate, its total population is…', [
    'Declining fast', 'Growing rapidly', 'Completely unchanged', 'Shrinking to zero'
  ], 1, 'Natural increase = Birth Rate − Death Rate; a large positive gap drives rapid growth.'),
  q('hu7g-15', 'G7', 'geography', 'What is "urban sprawl"?', [
    'Building compact neighborhoods near train stations',
    'Uncontrolled low-density outward expansion of a city into surrounding farmland and countryside',
    'Planting rooftop gardens downtown',
    'Constructing underground metro lines'
  ], 1, 'Urban sprawl increases car dependency, commutes, and loss of greenbelts.'),
  q('hu7g-16', 'G7', 'geography', 'Why do earthquakes and volcanoes occur frequently along the Pacific "Ring of Fire"?', [
    'Strong ocean winds push waves against beaches',
    'Several tectonic plates collide, subduct, and slide along Pacific boundaries',
    'Sunlight is brightest over the Pacific',
    'Deep-sea whales shake the seabed'
  ], 1, 'Subduction zones and transform faults release enormous crustal stress and magma.'),
  q('hu7g-17', 'G7', 'geography', 'What causes monsoon winds to bring heavy summer rains to South and East Asia?', [
    'Melting Arctic icebergs drifting south',
    'Differential heating draws moist ocean air inland toward warm summer landmasses',
    'Gravity weakens in July',
    'Tall skyscrapers push clouds down'
  ], 1, 'In summer, hot continents form low pressure that pulls humid oceanic monsoon winds ashore.'),
  q('hu7g-18', 'G7', 'geography', 'What does "carrying capacity" mean in human or environmental geography?', [
    'Maximum weight a cargo ship holds',
    'The maximum population an environment can sustain long-term without degrading resources',
    'The length of an airport runway',
    'Total passengers on a city subway line'
  ], 1, 'Exceeding local water, soil, or energy carrying capacity harms ecosystems and living standards.'),
  q('hu7g-19', 'G7', 'geography', 'Which policy helps reduce a city’s "Urban Heat Island" effect?', [
    'Replacing parks with black asphalt parking lots',
    'Adding street trees, green roofs, and reflective light-colored surfaces',
    'Closing all public fountains',
    'Running diesel buses inside tunnels'
  ], 1, 'Vegetation shades pavement and cools air through evapotranspiration.'),
  q('hu7g-20', 'G7', 'geography', 'Why is fresh water considered unevenly distributed worldwide even though Earth is 71% water-covered?', [
    'Almost 97% of water is salty ocean water, and most freshwater is locked in glaciers or deep aquifers',
    'Rain falls only over Antarctica',
    'Rivers flow upward in winter',
    'Clouds hold liquid salt'
  ], 0, 'Only a tiny fraction of Earth’s water is accessible liquid surface freshwater.'),
  q('hu7g-21', 'G7', 'geography', 'A population pyramid with a narrow base and bulging top age cohorts is most typical of…', [
    'A newly developing frontier town', 'An aging post-industrial country like Japan', 'A summer camp', 'A rapidly expanding rural village'
  ], 1, 'Low fertility and high life expectancy produce an inverted or top-heavy pyramid.'),
  q('hu7g-22', 'G7', 'geography', 'What is a "sponge city" design strategy adopted in modern Chinese urban planning?', [
    'Building skyscrapers entirely out of foam',
    'Using permeable pavements, wetlands, and rain gardens to absorb stormwater and prevent floods',
    'Pumping river water into mountains permanently',
    'Banning umbrellas outdoors'
  ], 1, 'Sponge city features soak up heavy downpours, cut runoff flooding, and recharge groundwater.'),
  q('hu7g-23', 'G7', 'geography', 'Which human activity contributes most to rising atmospheric CO₂ concentrations since 1850?', [
    'Organic composting', 'Burning coal, oil, and natural gas alongside deforestation', 'Operating hydroelectric dams', 'Tidal fishing'
  ], 1, 'Combusting fossil fuels releases ancient carbon while forest clearing reduces carbon sinks.'),
  q('hu7g-24', 'G7', 'geography', 'What do GIS (Geographic Information Systems) allow geographers and planners to do?', [
    'Predict winning lottery numbers',
    'Layer and analyze spatial data such as flood zones, transit routes, and population maps',
    'Heat homes using GPS satellites',
    'Replace physical oceans with VR'
  ], 1, 'GIS stacks geo-referenced data layers to reveal patterns and guide decisions.'),
  q('hu7g-25', 'G7', 'geography', 'Why are coastal mangrove forests valuable natural defenses?', [
    'They freeze hurricanes into ice',
    'Their tangled roots stabilize coastlines, trap sediment, and dampen storm surge waves',
    'They turn seawater into crude oil',
    'They attract lightning away from cities'
  ], 1, 'Mangroves buffer tropical storms and shelter juvenile fish.'),
  q('hu7g-26', 'G7', 'geography', 'Which term describes skilled professionals moving permanently to another country for better career opportunities?', [
    'Seasonal tourism', 'Brain drain / skilled migration', 'Subsistence herding', 'Weathering'
  ], 1, 'Sending regions can lose trained doctors or engineers while host hubs gain human capital.'),
  q('hu7g-27', 'G7', 'geography', 'How does "crop rotation" protect agricultural soil quality?', [
    'Tractors drive in circles all night',
    'Alternating different crops replenishes soil nutrients (like nitrogen) and disrupts pests',
    'Farmers flood fields with seawater',
    'Soil is baked in ovens yearly'
  ], 1, 'Legumes fix nitrogen that subsequent grain crops need, lowering synthetic fertilizer demand.'),
  q('hu7g-28', 'G7', 'geography', 'As you climb up a high mountain near the Equator, why does vegetation change from tropical forest to alpine tundra?', [
    'Gravity stops rain below 2,000 meters',
    'Air gets thinner and colder with higher altitude (~6.5°C cooler per 1,000 m)',
    'Mountains rotate faster than valleys',
    'Animals eat every tree'
  ], 1, 'Increasing altitude mimics moving toward higher latitudes due to decreasing temperature.'),
  q('hu7g-29', 'G7', 'geography', 'Which trade chokepoint connects the Mediterranean Sea directly to the Red Sea and Indian Ocean?', [
    'Panama Canal', 'Suez Canal', 'Bering Strait', 'English Channel'
  ], 1, 'The Suez Canal lets ships travel between Europe and Asia without rounding southern Africa.'),
  q('hu7g-30', 'G7', 'geography', 'What is the main advantage of high-speed rail over short-haul regional flights for cities 400 km apart?', [
    'Trains carry zero luggage',
    'Lower carbon emissions per passenger and downtown-to-downtown convenience',
    'Planes cannot fly over rivers',
    'Railways need no tracks'
  ], 1, 'Electrified rail uses cleaner grid energy and cuts airport transfer delays.'),
  q('hu7g-31', 'G7', 'geography', 'Which indicator combines life expectancy, education years, and income per person to compare living standards?', [
    'Richter Scale', 'Human Development Index (HDI)', 'Beaufort Wind Scale', 'Mohs Hardness Scale'
  ], 1, 'HDI gives a broader view of human well-being than GDP alone.'),
  q('hu7g-32', 'G7', 'geography', 'Desertification in semi-arid regions like the Sahel is worsened most by…', [
    'Installing solar microgrids', 'Overgrazing livestock and removing protective shrubs during droughts', 'Building stone terraces', 'Planting drought-hardy windbreaks'
  ], 1, 'Stripping vegetation exposes dry topsoil to wind erosion and moisture loss.')
];
