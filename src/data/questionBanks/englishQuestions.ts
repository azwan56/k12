import type { EssayPrompt, GradeLevel, PracticeQuestion } from '../k12Subjects';

const q = (
  id: string,
  grade: GradeLevel,
  track: string | undefined,
  question: string,
  options: string[],
  answer: number,
  explanation: string
): PracticeQuestion => ({ id, grade, track, question, options, answer, explanation });

export const EXPANDED_ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: 'g6-narrative-1',
    grade: 'G6',
    genre: '记叙文',
    title: 'A Challenge I Overcame',
    prompt: 'Write about a time you faced something hard. What happened, how did you feel, and what did you learn?',
    words: [150, 250],
    tips: ['Start with an exciting moment.', 'Show your feelings with details.', 'End with what you learned.']
  },
  {
    id: 'g6-persuasive-1',
    grade: 'G6',
    genre: '议论文',
    title: 'Should Schools Have Longer Breaks?',
    prompt: 'Do longer breaks help students learn better? Give your opinion and 2–3 reasons.',
    words: [150, 250],
    tips: ['Say your opinion first.', 'Give clear reasons with examples.', 'Mention the other side briefly.']
  },
  {
    id: 'g6-descriptive-1',
    grade: 'G6',
    genre: '描写文',
    title: 'A Place That Makes Me Calm',
    prompt: 'Describe a favorite place—such as a quiet library corner, a park bench, or your room. Use sight, sound, and touch details.',
    words: [150, 240],
    tips: ['Use at least three sensory details.', 'Describe why this place feels special.', 'End with a clear image or feeling.']
  },
  {
    id: 'g6-letter-1',
    grade: 'G6',
    genre: '书信应用',
    title: 'Letter to My Future Self',
    prompt: 'Write a letter to yourself five years from now. Share what you enjoy today, one goal you want to reach, and advice to remember.',
    words: [150, 240],
    tips: ['Include a warm greeting and closing.', 'Give specific details about your life now.', 'Ask your future self a thoughtful question.']
  },
  {
    id: 'g6-narrative-2',
    grade: 'G6',
    genre: '记叙文',
    title: 'The Best Teamwork Moment',
    prompt: 'Tell the story of a time you worked with classmates or family to finish a project or win a game. How did you help each other?',
    words: [150, 250],
    tips: ['Introduce the shared goal quickly.', 'Describe one problem your team solved.', 'Reflect on what good teamwork means.']
  },
  {
    id: 'g6-expository-1',
    grade: 'G6',
    genre: '说明文',
    title: 'How to Teach a Beginner My Favorite Skill',
    prompt: 'Explain step by step how someone can get started with a hobby you enjoy—like sketching, swimming, coding, or cooking.',
    words: [150, 250],
    tips: ['Use sequence words like First, Next, Finally.', 'Warn about one common beginner mistake.', 'Keep each step simple and clear.']
  },
  {
    id: 'g7-argument-1',
    grade: 'G7',
    genre: '议论文',
    title: 'AI Tools for Homework',
    prompt: 'Should students use AI tutors for homework, or should there be strict limits? Defend your view.',
    words: [200, 320],
    tips: ['Make a clear, balanced claim.', 'Compare benefits and risks.', 'Use linking words: However, Therefore.']
  },
  {
    id: 'g7-expository-1',
    grade: 'G7',
    genre: '说明文',
    title: 'My Green City in 2040',
    prompt: 'Design an eco-friendly neighborhood. Explain three systems that make it great to live in.',
    words: [200, 320],
    tips: ['One paragraph per system.', 'Use specific examples.', 'Show how they work together.']
  },
  {
    id: 'g7-speech-1',
    grade: 'G7',
    genre: '演讲稿',
    title: 'Why Our School Needs a Student Reading Lounge',
    prompt: 'Write a persuasive speech to your school principal proposing one improvement to campus life. Support it with evidence and practical steps.',
    words: [200, 300],
    tips: ['Open with an engaging hook for your audience.', 'Address cost or space concerns respectfully.', 'End with a memorable call to action.']
  },
  {
    id: 'g7-narrative-1',
    grade: 'G7',
    genre: '记叙文',
    title: 'The Mistake That Changed My Mind',
    prompt: 'Write about a misunderstanding or mistake that forced you to look at a person or situation differently.',
    words: [200, 320],
    tips: ['Establish what you believed at the start.', 'Show the turning point through action or dialogue.', 'Explain how your perspective shifted.']
  },
  {
    id: 'g7-argument-2',
    grade: 'G7',
    genre: '议论文',
    title: 'Competitive Sports vs. Fun-Only Clubs',
    prompt: 'Are competitive school sports teams better for middle schoolers than casual non-competitive clubs? Discuss both sides before taking a stand.',
    words: [200, 320],
    tips: ['Acknowledge valid points on the opposing side.', 'Support your main claim with concrete examples.', 'Maintain a formal, reasoned tone.']
  },
  {
    id: 'g7-review-1',
    grade: 'G7',
    genre: '书影评析',
    title: 'A Book or Documentary Everyone Should Explore',
    prompt: 'Review a book, film, or documentary that taught you something surprising. Summarize it briefly without spoiling the ending, then evaluate why it works.',
    words: [200, 300],
    tips: ['Give brief context before your evaluation.', 'Analyze a specific theme, character, or scene.', 'Recommend who would benefit most from it.']
  }
];

export const ENGLISH_QUESTIONS: PracticeQuestion[] = [
  // --- Grade 6 (32 questions) ---
  q('en6-1', 'G6', undefined, 'Which sentence uses "resilient" correctly?', [
    'The resilient glass broke at once.',
    'After losing, the resilient team trained harder and won.',
    'She felt resilient because she forgot lunch.',
    'The soup was too resilient to eat.'
  ], 1, '"Resilient" means able to bounce back quickly after a setback.'),
  q('en6-2', 'G6', undefined, 'Choose the correct verb: "Every student ___ a library card."', [
    'have', 'has', 'having', 'are having'
  ], 1, '"Every student" takes a singular verb, so use "has".'),
  q('en6-3', 'G6', undefined, 'Which word is a synonym of "enormous"?', [
    'tiny', 'gigantic', 'quiet', 'ancient'
  ], 1, '"Enormous" and "gigantic" both mean very big.'),
  q('en6-4', 'G6', undefined, 'Complete the sentence with the past tense: "Yesterday, Leo ___ his science poster at home."', [
    'leaves', 'left', 'leaving', 'has leave'
  ], 1, '"Yesterday" marks finished past time; the past tense of "leave" is "left".'),
  q('en6-5', 'G6', undefined, 'Which word is an ANTONYM of "reluctant"?', [
    'eager', 'hesitant', 'cautious', 'nervous'
  ], 0, '"Reluctant" means unwilling; "eager" means enthusiastic and ready.'),
  q('en6-6', 'G6', undefined, 'Choose the correct pronoun: "Between you and ___, this puzzle is tricky."', [
    'I', 'me', 'my', 'mine'
  ], 1, 'After the preposition "between", use the object pronoun "me".'),
  q('en6-7', 'G6', undefined, 'Which sentence uses punctuation correctly for dialogue?', [
    '"Let us check the map" said Maya.',
    '"Let us check the map," said Maya.',
    '"Let us check the map", said Maya.',
    'Let us check the map," said Maya.'
  ], 1, 'A comma goes inside the closing quotation mark before the dialogue tag.'),
  q('en6-8', 'G6', undefined, 'What does the prefix "micro-" mean in words like "microscope" and "microorganism"?', [
    'far away', 'very small', 'underwater', 'twice as many'
  ], 1, 'The Greek root/prefix "micro-" means extremely small.'),
  q('en6-9', 'G6', undefined, 'Identify the simile below:', [
    'The wind whispered through the pine trees.',
    'He has a heart of stone.',
    'Her backpack felt as heavy as a boulder.',
    'Time flew during art class.'
  ], 2, 'A simile directly compares two different things using "as" or "like".'),
  q('en6-10', 'G6', undefined, 'Choose the correct conjunction: "Mia practiced every afternoon ___ she still felt nervous before the concert."', [
    'yet', 'so', 'because', 'unless'
  ], 0, '"Yet" connects two contrasting ideas smoothly.'),
  q('en6-11', 'G6', undefined, 'Which sentence uses "their / there / they\'re" correctly?', [
    'Their going to pack they\'re lunches over there.',
    'They\'re going to pack their lunches over there.',
    'There going to pack their lunches over they\'re.',
    'They\'re going to pack there lunches over their.'
  ], 1, '"They\'re" = they are, "their" shows ownership, and "there" shows place.'),
  q('en6-12', 'G6', undefined, 'What does "diligent" mean in "A diligent reader takes notes while studying"?', [
    'careless', 'hardworking and careful', 'easily distracted', 'always rushing'
  ], 1, '"Diligent" describes steady, careful effort.'),
  q('en6-13', 'G6', undefined, 'Choose the correct comparative form: "The cheetah is ___ than the greyhound."', [
    'more fast', 'fastest', 'faster', 'most fast'
  ], 2, 'Short one-syllable adjectives add "-er" when comparing two things.'),
  q('en6-14', 'G6', undefined, 'Which sentence contains personification?', [
    'The old hinges groaned when the gate swung open.',
    'The wooden gate was painted bright blue.',
    'Three sparrows perched on top of the gate.',
    'The gate stood two meters tall.'
  ], 0, 'Giving human action ("groaned") to an object (hinges) is personification.'),
  q('en6-15', 'G6', undefined, 'Which word matches the definition: "able to see through something clearly, like clean glass"?', [
    'opaque', 'transparent', 'fragile', 'peculiar'
  ], 1, '"Transparent" allows light and images to pass through clearly.'),
  q('en6-16', 'G6', undefined, 'Choose the best tense: "Look at those dark clouds! It ___ soon."', [
    'rained', 'is going to rain', 'has rained yesterday', 'was raining tomorrow'
  ], 1, '"Be going to" expresses a prediction based on present evidence.'),
  q('en6-17', 'G6', undefined, 'Which word should replace the vague word "good" in "She gave a good speech that convinced the whole class"?', [
    'okay', 'persuasive', 'average', 'loud'
  ], 1, '"Persuasive" is precise and matches convincing the class.'),
  q('en6-18', 'G6', undefined, 'Spot the correctly spelled plural noun:', [
    'childs', 'potatoes', 'knifes', 'womans'
  ], 1, '"Potato" adds "-es" to form "potatoes".'),
  q('en6-19', 'G6', undefined, 'Choose the correct preposition: "Our robotics club meets ___ Tuesdays after school."', [
    'in', 'at', 'on', 'by'
  ], 2, 'Use "on" with specific days of the week.'),
  q('en6-20', 'G6', undefined, 'What is the main purpose of a topic sentence in a paragraph?', [
    'To list every tiny detail in the essay',
    'To state the main idea of that paragraph',
    'To thank the reader at the end',
    'To introduce an unrelated joke'
  ], 1, 'A topic sentence tells the reader the central point the paragraph will support.'),
  q('en6-21', 'G6', undefined, 'Read the sentence: "Unlike arid deserts, rainforests stay humid all year." Here, "arid" most likely means…', [
    'crowded', 'very dry', 'mountainous', 'noisy'
  ], 1, 'The contrast clue "Unlike ... humid" shows "arid" means very dry.'),
  q('en6-22', 'G6', undefined, 'Which sentence uses an apostrophe correctly for possession?', [
    'The cats bowl\'s are empty.',
    'The cat\'s bowl is near the door.',
    'The cats\'s bowl is near the door.',
    'The cat\'s are sleeping upstairs.'
  ], 1, 'One cat owning a bowl is written "the cat\'s bowl".'),
  q('en6-23', 'G6', undefined, 'Choose the correct verb form: "Neither Sam nor his sisters ___ ready to leave yet."', [
    'is', 'are', 'was', 'be'
  ], 1, 'With "neither... nor...", the verb agrees with the closer subject ("his sisters" -> plural "are").'),
  q('en6-24', 'G6', undefined, 'Which word has the suffix "-less" meaning "without"?', [
    'hopeless', 'kindness', 'teacher', 'joyful'
  ], 0, '"-less" means without, so "hopeless" means without hope.'),
  q('en6-25', 'G6', undefined, 'Select the complete sentence (not a fragment or run-on):', [
    'Because the rain stopped before noon.',
    'Running across the muddy soccer field.',
    'After the rain stopped, we hurried outside to play.',
    'The bell rang we packed our bags immediately.'
  ], 2, '"After the rain stopped, we hurried outside to play." has an independent clause and correct comma.'),
  q('en6-26', 'G6', undefined, 'In story writing, what does "Show, don\'t tell" encourage writers to do?', [
    'Draw illustrations on every page',
    'Use actions and sensory details instead of plain labels',
    'Repeat the character\'s name ten times',
    'Only write one-word sentences'
  ], 1, 'Showing uses concrete actions and details so readers picture emotions themselves.'),
  q('en6-27', 'G6', undefined, 'Which adverb modifies the verb "spoke" best in "Wait quietly because Grandma is napping, she spoke ___."', [
    'soft', 'softly', 'softness', 'softerly'
  ], 1, '"Softly" is the adverb modifying how she spoke.'),
  q('en6-28', 'G6', undefined, 'What does "collaborate" mean?', [
    'to argue loudly', 'to work together toward a shared goal', 'to memorize alone', 'to cancel an event'
  ], 1, '"Col-" (together) + "labor" (work) = work together.'),
  q('en6-29', 'G6', undefined, 'Choose the correct question tag: "You finished your math sheet already, ___?"', [
    'don\'t you', 'didn\'t you', 'haven\'t it', 'aren\'t you'
  ], 1, 'Past simple positive statement ("finished") pairs with negative tag "didn\'t you".'),
  q('en6-30', 'G6', undefined, 'Which detail would NOT belong in an informational paragraph about sea turtle conservation?', [
    'Volunteers protect nests on sandy beaches at night.',
    'Plastic bags in oceans look like jellyfish to turtles.',
    'My cousin once bought a plastic toy dinosaur.',
    'Reducing bright beach lights helps hatchlings reach the sea.'
  ], 2, 'Paragraph unity requires dropping off-topic personal anecdotes.'),
  q('en6-31', 'G6', undefined, 'Which pair of words are homophones?', [
    'happy / joyful', 'knight / night', 'big / small', 'teacher / student'
  ], 1, 'Homophones sound identical but differ in spelling and meaning.'),
  q('en6-32', 'G6', undefined, 'Choose the correct form: "By the time we arrived at the station, the train ___."', [
    'leaves', 'had already left', 'is leaving', 'will leaves'
  ], 1, 'Past perfect ("had left") shows an action completed before another past moment.'),

  // --- Grade 7 (32 questions) ---
  q('en7-1', 'G7', undefined, 'Which is the strongest thesis statement for an argumentative essay?', [
    'School uniforms exist in many schools.',
    'I will write about uniforms today.',
    'Although critics argue uniforms limit self-expression, they reduce peer pressure and sharpen classroom focus.',
    'Uniforms are often navy blue and white.'
  ], 2, 'A strong thesis takes a defensible stance and acknowledges a counterargument.'),
  q('en7-2', 'G7', undefined, 'Pick the best transition word: "The prototype was inexpensive. ___, it failed the waterproof test."', [
    'Therefore', 'However', 'For example', 'Similarly'
  ], 1, '"However" signals contrast between low cost and test failure.'),
  q('en7-3', 'G7', undefined, 'Which sentence is in the passive voice?', [
    'The chemist measured the pH carefully.',
    'The water sample was tested by the chemist.',
    'The chemist is recording the results.',
    'The chemist will publish a report tomorrow.'
  ], 1, 'Passive voice uses be + past participle ("was tested") with the receiver as subject.'),
  q('en7-4', 'G7', undefined, 'In academic writing, what is the purpose of a counterargument paragraph?', [
    'To prove you forgot your own opinion',
    'To address an opposing view fairly and show why your claim still holds',
    'To add random quotes to make the essay longer',
    'To repeat your introduction word for word'
  ], 1, 'Addressing counterarguments builds credibility (ethos) and strengthens your reasoning.'),
  q('en7-5', 'G7', undefined, 'Which word best fits: "Even under intense questioning, the witness gave a ___ account with clear dates and details."', [
    'coherent', 'erratic', 'fragile', 'reluctant'
  ], 0, '"Coherent" means logical, clear, and consistent.'),
  q('en7-6', 'G7', undefined, 'Choose the sentence WITHOUT a dangling modifier:', [
    'Walking through the museum, the ancient vase caught my eye.',
    'Covered in dust, Nora wiped the old telescope clean.',
    'Walking through the museum, I noticed an ancient bronze vase.',
    'Hoping for a clear sky, the telescope was set up on the roof.'
  ], 2, 'The subject right after the introductory phrase must be the doer ("I").'),
  q('en7-7', 'G7', undefined, 'Which sentence uses a semicolon correctly?', [
    'I love astronomy; because the night sky fascinates me.',
    'Mars has two tiny moons; Jupiter has dozens.',
    'Bring three items; a notebook, a ruler, and a pen.',
    'Although it rained; we finished the hike.'
  ], 1, 'A semicolon joins two closely related independent clauses without a coordinating conjunction.'),
  q('en7-8', 'G7', undefined, 'What does the root "cred" mean in "credible", "incredible", and "credibility"?', [
    'speak', 'believe or trust', 'write', 'move forward'
  ], 1, 'The Latin root "cred" means believe or trust.'),
  q('en7-9', 'G7', undefined, 'Identify the sentence that demonstrates parallel structure:', [
    'Students were asked to read carefully, take notes, and reviewing vocabulary.',
    'Students were asked to read carefully, take notes, and review vocabulary.',
    'Students were asked reading carefully, to take notes, and review vocabulary.',
    'Students were asked to read carefully, noting, and to review vocabulary.'
  ], 1, 'Parallel structure keeps listed verbs in matching grammatical form (read, take, review).'),
  q('en7-10', 'G7', undefined, 'Which word is closest in meaning to "ambiguous"?', [
    'crystal clear', 'open to more than one interpretation', 'strictly forbidden', 'scientifically proven'
  ], 1, '"Ambiguous" means unclear or having multiple possible meanings.'),
  q('en7-11', 'G7', undefined, 'In persuasive writing, appealing to statistics and verified studies primarily uses…', [
    'pathos (emotion)', 'logos (logic and evidence)', 'hyperbole (exaggeration)', 'alliteration'
  ], 1, '"Logos" persuades using reason, facts, and data.'),
  q('en7-12', 'G7', undefined, 'Choose the right conditional: "If our solar panel ___ more sunlight, the rover would travel farther."', [
    'captures', 'captured', 'will capture', 'has capture'
  ], 1, 'Second conditional (hypothetical present/future) pairs past simple in the if-clause with "would + verb".'),
  q('en7-13', 'G7', undefined, 'Which sentence correctly uses a colon?', [
    'My favorite subjects are: math, history, and biology.',
    'She brought everything needed for the lab: goggles, gloves, and a timer.',
    'Because: the data was incomplete, we repeated the trial.',
    'The train leaves at: 7:30 a.m.'
  ], 1, 'Use a colon after a complete independent clause to introduce a list or explanation.'),
  q('en7-14', 'G7', undefined, 'What does "mitigate" mean in "Planting coastal mangroves helps mitigate storm damage"?', [
    'make less severe', 'completely ignore', 'double the size of', 'measure quickly'
  ], 0, '"Mitigate" means to reduce the harm or severity of something.'),
  q('en7-15', 'G7', undefined, 'Choose the best replacement for "a lot of things happened that caused problems" in a formal report:', [
    'Stuff went super wrong for everyone.',
    'Several technical failures delayed the launch.',
    'Bad things kept popping up nonstop.',
    'A huge bunch of messes occurred.'
  ], 1, 'Formal academic register favors concise, specific nouns and verbs over slang.'),
  q('en7-16', 'G7', undefined, 'Which pronoun correctly introduces a non-essential relative clause for a person?', [
    'which', 'who', 'what', 'where'
  ], 1, 'Use "who" (with commas around non-essential clauses) when referring to people.'),
  q('en7-17', 'G7', undefined, 'Read: "The author contrasts the bustling market with a silent temple." What literary device is highlighted?', [
    'onomatopoeia', 'juxtaposition', 'pun', 'allusion'
  ], 1, 'Placing two sharply contrasting images side by side is juxtaposition.'),
  q('en7-18', 'G7', undefined, 'Choose the correct word pair: "The new policy will ___ every commuter, though its long-term ___ remains unclear."', [
    'effect / affect', 'affect / effect', 'affect / affect', 'effect / effect'
  ], 1, '"Affect" is usually the verb (to influence); "effect" is usually the noun (the result).'),
  q('en7-19', 'G7', undefined, 'Which sentence correctly uses the third conditional (unreal past)?', [
    'If they checked the forecast, they wouldn\'t get caught in the storm.',
    'If they had checked the forecast, they would not have been caught in the storm.',
    'If they check the forecast, they wouldn\'t have been caught.',
    'If they would check the forecast, they didn\'t get caught.'
  ], 1, 'Third conditional uses "If + past perfect, would have + past participle".'),
  q('en7-20', 'G7', undefined, 'When summarizing an informational article, what should you OMIT?', [
    'the central claim', 'major supporting reasons', 'your own personal opinions', 'the key conclusion'
  ], 2, 'An objective summary states the author\'s main ideas without inserting personal bias.'),
  q('en7-21', 'G7', undefined, 'Which word is an ANTONYM of "plausible"?', [
    'believable', 'reasonable', 'implausible', 'credible'
  ], 2, 'Adding "im-" turns "plausible" (believable) into "implausible" (hard to believe).'),
  q('en7-22', 'G7', undefined, 'Identify the tone of this sentence: "Clearly, any policy ignoring student sleep ignores decades of brain science."', [
    'humorous and playful', 'critical and assertive', 'timid and unsure', 'nostalgic and dreamy'
  ], 1, 'Strong phrasing like "Clearly" and "ignores decades of brain science" signals a critical, assertive tone.'),
  q('en7-23', 'G7', undefined, 'Choose the grammatically correct sentence:', [
    'The committee has announced their decision yesterday.',
    'The data from the three experiments support our hypothesis.',
    'Each of the participants were given a badge.',
    'Less students joined the debate club this term.'
  ], 1, '"Data ... support" is consistent, whereas "Each" requires "was" and countable "students" takes "fewer".'),
  q('en7-24', 'G7', undefined, 'What is the best definition of "pragmatic"?', [
    'dealing with things sensibly and realistically',
    'refusing to listen to evidence',
    'based purely on ancient myths',
    'done without any planning'
  ], 0, '"Pragmatic" focuses on practical results rather than abstract theories alone.'),
  q('en7-25', 'G7', undefined, 'Which transition signals a CAUSE-AND-EFFECT relationship?', [
    'Meanwhile', 'Consequently', 'In contrast', 'Furthermore'
  ], 1, '"Consequently" means "as a result".'),
  q('en7-26', 'G7', undefined, 'What is the difference between "fewer" and "less"?', [
    'They can never be used with nouns.',
    '"Fewer" is used for countable items; "less" for uncountable amounts.',
    '"Less" is only used in British English.',
    '"Fewer" always refers to time.'
  ], 1, 'Use "fewer" with plural countable nouns (fewer errors) and "less" with mass nouns (less time).'),
  q('en7-27', 'G7', undefined, 'Which sentence integrates a quotation most smoothly?', [
    'The article proves it. "Solar costs fell by 80%."',
    'According to energy analyst Lin Chen, "solar panel costs have fallen by over eighty percent since 2010."',
    'Quoting the text here: "Solar panel costs have fallen."',
    '"Solar panel costs have fallen" says in the article.'
  ], 1, 'Lead into a quote with a signal phrase identifying the speaker or source.'),
  q('en7-28', 'G7', undefined, 'What does "scrutinize" mean?', [
    'to glance at briefly', 'to examine closely and critically', 'to hide carefully', 'to forgive immediately'
  ], 1, 'To "scrutinize" means to inspect every detail with care.'),
  q('en7-29', 'G7', undefined, 'Which word uses the prefix "anti-" meaning "against"?', [
    'anticipate', 'antibiotic', 'antique', 'antelope'
  ], 1, '"Antibiotic" comes from "anti-" (against) + "bio" (life/microbes).'),
  q('en7-30', 'G7', undefined, 'Which revision eliminates wordiness from "Due to the fact that the battery died, the drone landed early"?', [
    'Owing to the battery dying fact, the drone landed early.',
    'Because the battery died, the drone landed early.',
    'In view of the fact that the battery had died, the drone landed early.',
    'The battery died for the reason that the drone landed early.'
  ], 1, 'Replacing "Due to the fact that" with "Because" improves clarity and conciseness.'),
  q('en7-31', 'G7', undefined, 'What is an unreliable narrator in fiction?', [
    'A narrator whose speech is quiet',
    'A narrator whose version of events readers have reason to question',
    'Any story told in the third person',
    'A character who speaks two languages'
  ], 1, 'An unreliable narrator may distort facts due to bias, age, or incomplete knowledge.'),
  q('en7-32', 'G7', undefined, 'Choose the correct subjunctive mood: "The coach insisted that Maya ___ on time for warm-ups."', [
    'is', 'be', 'was', 'being'
  ], 1, 'After verbs of demand/insistence ("insisted that"), formal English uses the bare infinitive "be".')
];
