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

export const IG_MATH_QUESTIONS: PracticeQuestion[] = [
  // --- Grade 6 (32 questions) ---
  q('igm6-1', 'G6', undefined, 'An $80 jacket is 25% off. What is the sale price?', ['$55', '$60', '$65', '$20'], 1,
    '25% of 80 = 20, and 80 − 20 = $60.'),
  q('igm6-2', 'G6', undefined, 'Simplify the ratio 18 : 24 to its lowest terms.', ['3 : 4', '2 : 3', '9 : 16', '6 : 9'], 0,
    'Divide both parts by their GCF of 6: 18 ÷ 6 = 3 and 24 ÷ 6 = 4.'),
  q('igm6-3', 'G6', undefined, 'If a = 4, what is the value of 3a + 5?', ['12', '17', '35', '9'], 1,
    '3 × 4 + 5 = 12 + 5 = 17.'),
  q('igm6-4', 'G6', undefined, 'Divide fractions: What is (3/4) ÷ (3/8)?', ['9/32', '1/2', '2', '3/2'], 2,
    'Multiply by the reciprocal: (3/4) × (8/3) = 24/12 = 2.'),
  q('igm6-5', 'G6', undefined, 'A train travels 210 km in 3 hours at constant speed. What is its unit rate in km/h?', [
    '60 km/h', '70 km/h', '75 km/h', '630 km/h'
  ], 1, 'Unit rate = 210 ÷ 3 = 70 km/h.'),
  q('igm6-6', 'G6', undefined, 'Convert 0.35 into a fraction in simplest form.', ['35/10', '7/20', '3/5', '1/3'], 1,
    '0.35 = 35/100; dividing top and bottom by 5 gives 7/20.'),
  q('igm6-7', 'G6', undefined, 'Which integer is the GREATEST: −12, −4, −19, or −1?', ['−12', '−4', '−19', '−1'], 3,
    'On a number line, −1 lies farthest to the right, so it is greatest.'),
  q('igm6-8', 'G6', undefined, 'Find the area of a right triangle with base 10 cm and height 6 cm.', ['16 cm²', '30 cm²', '60 cm²', '32 cm²'], 1,
    'Area = (1/2) × base × height = (1/2) × 10 × 6 = 30 cm².'),
  q('igm6-9', 'G6', undefined, 'What is the absolute value |−14|?', ['−14', '0', '14', '1/14'], 2,
    'Absolute value is the distance from 0, which is always non-negative: 14.'),
  q('igm6-10', 'G6', undefined, 'Solve for x: x − 9 = 16', ['7', '25', '−7', '144'], 1,
    'Add 9 to both sides: x = 16 + 9 = 25.'),
  q('igm6-11', 'G6', undefined, 'A recipe uses 2 cups of oats for every 5 cups of water. How many cups of water are needed for 6 cups of oats?', [
    '10', '12', '15', '18'
  ], 2, 'Oats tripled (2 × 3 = 6), so water also triples: 5 × 3 = 15 cups.'),
  q('igm6-12', 'G6', undefined, 'Evaluate 2³ + 4 × 3.', ['18', '20', '36', '14'], 1,
    'Compute exponents first (2³ = 8), then multiply (4 × 3 = 12): 8 + 12 = 20.'),
  q('igm6-13', 'G6', undefined, 'If 40% of the students in a club are boys and there are 12 boys, how many total students are in the club?', [
    '24', '30', '48', '20'
  ], 1, '0.40 × Total = 12 → Total = 12 ÷ 0.4 = 30.'),
  q('igm6-14', 'G6', undefined, 'Find the perimeter of a rectangle with length 11 cm and width 4 cm.', ['15 cm', '22 cm', '30 cm', '44 cm'], 2,
    'Perimeter = 2 × (11 + 4) = 2 × 15 = 30 cm.'),
  q('igm6-15', 'G6', undefined, 'A fair six-sided die is rolled once. What is the probability of rolling an even number?', [
    '1/6', '1/3', '1/2', '2/3'
  ], 2, 'There are 3 even outcomes (2, 4, 6) out of 6, so 3/6 = 1/2.'),
  q('igm6-16', 'G6', undefined, 'Simplify by combining like terms: 5x + 3y − 2x + 4y', ['7x + 7y', '3x + 7y', '3x − y', '10xy'], 1,
    '(5x − 2x) + (3y + 4y) = 3x + 7y.'),
  q('igm6-17', 'G6', undefined, 'Which point lies in Quadrant II of the coordinate plane?', [
    '(3, 5)', '(−4, 2)', '(−3, −6)', '(5, −1)'
  ], 1, 'Quadrant II has negative x and positive y: (−4, 2).'),
  q('igm6-18', 'G6', undefined, 'Find the volume of a rectangular prism measuring 5 cm × 3 cm × 4 cm.', ['12 cm³', '47 cm³', '60 cm³', '94 cm³'], 2,
    'Volume = length × width × height = 5 × 3 × 4 = 60 cm³.'),
  q('igm6-19', 'G6', undefined, 'What is 1.25 × 0.4?', ['0.05', '0.5', '5.0', '0.45'], 1,
    '125 × 4 = 500; with 3 decimal places in total, 0.500 = 0.5.'),
  q('igm6-20', 'G6', undefined, 'What is the median of this data set: 4, 9, 2, 11, 7?', ['4', '6.6', '7', '9'], 2,
    'Ordered from least to greatest: 2, 4, 7, 9, 11. The middle number is 7.'),
  q('igm6-21', 'G6', undefined, 'Find the greatest common factor (GCF) of 24 and 36.', ['6', '8', '12', '72'], 2,
    'Factors of 24 and 36 share 12 as the largest common factor.'),
  q('igm6-22', 'G6', undefined, 'Which algebraic expression represents "5 less than twice a number n"?', [
    '5 − 2n', '2n − 5', '2(n − 5)', '5n − 2'
  ], 1, '"Twice n" is 2n, and "5 less than" subtracts 5: 2n − 5.'),
  q('igm6-23', 'G6', undefined, 'Use the distributive property to expand 4(2x + 3).', ['8x + 3', '6x + 7', '8x + 12', '2x + 12'], 2,
    '4 × 2x + 4 × 3 = 8x + 12.'),
  q('igm6-24', 'G6', undefined, 'A bag holds 3 red, 5 blue, and 2 green marbles. What is the probability of picking a blue marble at random?', [
    '1/5', '1/2', '3/10', '5/8'
  ], 1, 'Total marbles = 3 + 5 + 2 = 10; P(blue) = 5/10 = 1/2.'),
  q('igm6-25', 'G6', undefined, 'The temperature at dawn was −3°C and rose by 9°C by noon. What was the noon temperature?', [
    '−12°C', '−6°C', '6°C', '12°C'
  ], 2, '−3 + 9 = 6°C.'),
  q('igm6-26', 'G6', undefined, 'What is 15% of 200?', ['15', '30', '40', '60'], 1,
    '10% of 200 is 20, and 5% is 10, so 15% = 30.'),
  q('igm6-27', 'G6', undefined, 'A store sells 6 notebooks for $9.00. At the same rate, how much do 10 notebooks cost?', [
    '$12.00', '$13.50', '$15.00', '$18.00'
  ], 2, 'Unit price = $9 ÷ 6 = $1.50 per notebook; 10 × $1.50 = $15.00.'),
  q('igm6-28', 'G6', undefined, 'What is the distance between (−2, 5) and (6, 5) on a coordinate grid?', [
    '4 units', '8 units', '10 units', '11 units'
  ], 1, 'Both points share y = 5, so distance = |6 − (−2)| = 8 units.'),
  q('igm6-29', 'G6', undefined, 'Solve: 7x = 56', ['7', '8', '9', '49'], 1,
    'Divide both sides by 7: x = 56 ÷ 7 = 8.'),
  q('igm6-30', 'G6', undefined, 'Which inequality represents "a height h must be at least 120 cm to ride"?', [
    'h < 120', 'h > 120', 'h ≤ 120', 'h ≥ 120'
  ], 3, '"At least 120" means 120 or greater: h ≥ 120.'),
  q('igm6-31', 'G6', undefined, 'Find the mean (average) of 12, 15, 18, and 15.', ['14', '15', '16', '60'], 1,
    '(12 + 15 + 18 + 15) ÷ 4 = 60 ÷ 4 = 15.'),
  q('igm6-32', 'G6', undefined, 'What is the least common multiple (LCM) of 6 and 8?', ['2', '12', '24', '48'], 2,
    'Multiples of 8: 8, 16, 24; 24 is the smallest also divisible by 6.'),

  // --- Grade 7 (32 questions) ---
  q('igm7-1', 'G7', undefined, 'Solve: 3(2x − 4) = 18', ['x = 3', 'x = 5', 'x = 7', 'x = 10'], 1,
    'Divide by 3: 2x − 4 = 6 → 2x = 10 → x = 5.'),
  q('igm7-2', 'G7', undefined, 'What is the gradient (slope) of the line y = 3x − 2?', ['−2', '3', '2', '−3'], 1,
    'In y = mx + c, the coefficient m of x is the gradient: 3.'),
  q('igm7-3', 'G7', undefined, 'The three angles of a triangle are 50°, 60°, and x. Find x.', ['60°', '70°', '80°', '90°'], 1,
    'Triangle angles sum to 180°: 180 − 50 − 60 = 70°.'),
  q('igm7-4', 'G7', undefined, 'Calculate: (−6) × (−4) + (−5)', ['−29', '19', '−19', '29'], 1,
    '(−6) × (−4) = 24, and 24 + (−5) = 19.'),
  q('igm7-5', 'G7', undefined, 'A jacket priced at $120 increases by 15%. What is the new price?', ['$135', '$138', '$140', '$102'], 1,
    '15% of 120 = 18, so 120 + 18 = $138.'),
  q('igm7-6', 'G7', undefined, 'Find the gradient of the line passing through (1, 2) and (5, 10).', ['1/2', '2', '4', '8'], 1,
    'm = (10 − 2) / (5 − 1) = 8 / 4 = 2.'),
  q('igm7-7', 'G7', undefined, 'Which point lies on the line y = 2x + 1?', ['(2, 4)', '(3, 7)', '(1, 5)', '(0, 2)'], 1,
    'When x = 3, y = 2(3) + 1 = 7, so (3, 7) is on the line.'),
  q('igm7-8', 'G7', undefined, 'Two angles are supplementary. One measures 112°. What is the other angle?', ['22°', '68°', '78°', '248°'], 1,
    'Supplementary angles add to 180°: 180 − 112 = 68°.'),
  q('igm7-9', 'G7', undefined, 'Solve the two-step inequality: 2x + 5 < 13', ['x < 4', 'x < 9', 'x > 4', 'x ≤ 4'], 0,
    'Subtract 5: 2x < 8 → x < 4.'),
  q('igm7-10', 'G7', undefined, 'Find the circumference of a circle with radius 7 cm (use π ≈ 22/7).', ['22 cm', '44 cm', '154 cm', '14 cm'], 1,
    'C = 2πr = 2 × (22/7) × 7 = 44 cm.'),
  q('igm7-11', 'G7', undefined, 'Divide money in the ratio 3 : 5. How much is the larger share out of $160?', [
    '$60', '$80', '$100', '$120'
  ], 2, 'Total parts = 3 + 5 = 8; 1 part = 160 ÷ 8 = $20; larger share = 5 × $20 = $100.'),
  q('igm7-12', 'G7', undefined, 'Simplify: −2(3a − 5) + 4a', ['−2a − 10', '−2a + 10', '10a − 10', '−10a + 10'], 1,
    '−6a + 10 + 4a = −2a + 10.'),
  q('igm7-13', 'G7', undefined, 'Find the area of a circle with radius 5 cm in terms of π.', ['10π cm²', '25π cm²', '50π cm²', '5π cm²'], 1,
    'Area = πr² = π × 5² = 25π cm².'),
  q('igm7-14', 'G7', undefined, 'Evaluate (−3)² − (−3)³.', ['−18', '36', '18', '−36'], 1,
    '(−3)² = 9 and (−3)³ = −27; so 9 − (−27) = 9 + 27 = 36.'),
  q('igm7-15', 'G7', undefined, 'Solve for x: 5x − 7 = 2x + 8', ['x = 3', 'x = 5', 'x = 1', 'x = 15'], 1,
    'Subtract 2x and add 7: 3x = 15 → x = 5.'),
  q('igm7-16', 'G7', undefined, 'A cylinder has base area 20 cm² and height 6 cm. Find its volume.', ['26 cm³', '60 cm³', '120 cm³', '240 cm³'], 2,
    'Volume = base area × height = 20 × 6 = 120 cm³.'),
  q('igm7-17', 'G7', undefined, 'If two parallel lines are cut by a transversal, alternate interior angles are…', [
    'always 90°', 'always equal', 'always supplementary (180°)', 'never related'
  ], 1, 'Alternate interior angles between parallel lines are equal.'),
  q('igm7-18', 'G7', undefined, 'What is the scale factor from a 4 cm triangle side to a similar 14 cm triangle side?', [
    '2.5', '3.5', '10', '0.4'
  ], 1, 'Scale factor = 14 ÷ 4 = 3.5.'),
  q('igm7-19', 'G7', undefined, 'A coat was discounted by 20% and now costs $64. What was the original price?', [
    '$76.80', '$80.00', '$84.00', '$96.00'
  ], 1, '80% of original = 64 → Original = 64 ÷ 0.8 = $80.00.'),
  q('igm7-20', 'G7', undefined, 'Find the total surface area of a cube with side length 4 cm.', ['64 cm²', '96 cm²', '16 cm²', '48 cm²'], 1,
    'A cube has 6 faces each of area 4 × 4 = 16 cm², so 6 × 16 = 96 cm².'),
  q('igm7-21', 'G7', undefined, 'If −3x ≥ 12, what is the solution set for x?', ['x ≥ −4', 'x ≤ −4', 'x ≥ 4', 'x ≤ 4'], 1,
    'Dividing an inequality by negative −3 reverses the inequality sign: x ≤ −4.'),
  q('igm7-22', 'G7', undefined, 'Simplify using index laws: x⁵ × x³', ['x⁸', 'x¹⁵', 'x²', '2x⁸'], 0,
    'When multiplying powers with the same base, add exponents: 5 + 3 = 8.'),
  q('igm7-23', 'G7', undefined, 'A spinner has 3 equal red sections and 5 equal blue sections. It is spun 80 times. About how many times should red appear?', [
    '15', '30', '40', '50'
  ], 1, 'P(red) = 3/8; expected count = (3/8) × 80 = 30.'),
  q('igm7-24', 'G7', undefined, 'What is the sum of the interior angles of a regular pentagon (5 sides)?', [
    '360°', '540°', '720°', '180°'
  ], 1, 'Formula (n − 2) × 180° = (5 − 2) × 180° = 540°.'),
  q('igm7-25', 'G7', undefined, 'Write 0.0048 in standard form (scientific notation).', [
    '4.8 × 10⁻³', '4.8 × 10⁻²', '48 × 10⁻⁴', '0.48 × 10⁻²'
  ], 0, 'Move decimal 3 places right to get 4.8, so 4.8 × 10⁻³.'),
  q('igm7-26', 'G7', undefined, 'What is the y-intercept of the line 2y = 6x − 8?', ['(0, −8)', '(0, −4)', '(0, 3)', '(0, 6)'], 1,
    'Divide by 2: y = 3x − 4, so the y-intercept c is −4 → (0, −4).'),
  q('igm7-27', 'G7', undefined, 'Find the area of a trapezium with parallel sides 6 cm and 10 cm, and height 5 cm.', [
    '30 cm²', '40 cm²', '80 cm²', '60 cm²'
  ], 1, 'Area = (6 + 10) / 2 × 5 = 8 × 5 = 40 cm².'),
  q('igm7-28', 'G7', undefined, 'In a survey of 50 students, 18 walk to school. What percentage walk to school?', [
    '18%', '32%', '36%', '40%'
  ], 2, '18 / 50 = 36 / 100 = 36%.'),
  q('igm7-29', 'G7', undefined, 'A box plot shows Q1 = 14 and Q3 = 29. What is the interquartile range (IQR)?', [
    '14', '15', '21.5', '43'
  ], 1, 'IQR = Q3 − Q1 = 29 − 14 = 15.'),
  q('igm7-30', 'G7', undefined, 'Which equation represents a line PARALLEL to y = −4x + 7?', [
    'y = 4x + 7', 'y = −4x − 3', 'y = (1/4)x + 7', 'y = 7x − 4'
  ], 1, 'Parallel lines have identical gradients (m = −4).'),
  q('igm7-31', 'G7', undefined, 'Two fair coins are tossed together. What is the probability of getting at least one head?', [
    '1/4', '1/2', '3/4', '2/3'
  ], 2, 'Outcomes are HH, HT, TH, TT. Three of the 4 outcomes have at least one head: 3/4.'),
  q('igm7-32', 'G7', undefined, 'Simplify: (12x⁶) ÷ (3x²)', ['4x³', '4x⁴', '9x⁴', '4x⁸'], 1,
    'Divide coefficients (12 ÷ 3 = 4) and subtract exponents (6 − 2 = 4): 4x⁴.')
];
