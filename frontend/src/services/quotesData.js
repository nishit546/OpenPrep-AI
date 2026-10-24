/**
 * Motivational Quotes Engine for Academic Exam Preparation
 * Curated collection of 100+ inspiring quotes from renowned scientists, mathematicians, and scholars.
 * Provides deterministic daily quote selection based on day-of-year.
 */

export const ACADEMIC_QUOTES = [
  {
    id: 1,
    quote: "Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.",
    author: "Richard Feynman",
    field: "Theoretical Physics (Nobel Laureate)",
    context: "On curiosity-driven learning and genuine understanding."
  },
  {
    id: 2,
    quote: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    field: "Physics & Chemistry (Nobel Laureate)",
    context: "On facing intimidating academic topics with patient analysis."
  },
  {
    id: 3,
    quote: "An equation for me has no meaning unless it expresses a thought of God.",
    author: "Srinivasa Ramanujan",
    field: "Pure Mathematics",
    context: "On the sublime beauty and harmony found in mathematical patterns."
  },
  {
    id: 4,
    quote: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    field: "Computer Science & Mathematics",
    context: "On steady, disciplined incremental problem solving."
  },
  {
    id: 5,
    quote: "It is not that I'm so smart. But I stay with the questions much longer.",
    author: "Albert Einstein",
    field: "Theoretical Physics",
    context: "On the power of deep cognitive endurance over innate talent."
  },
  {
    id: 6,
    quote: "That brain of mine is something more than merely mortal, as time will show.",
    author: "Ada Lovelace",
    field: "Computer Science & Analytical Engines",
    context: "On pioneering intellectual self-confidence."
  },
  {
    id: 7,
    quote: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
    field: "Astronomy & Astrophysics",
    context: "On maintaining wonder during rigorous exam study sessions."
  },
  {
    id: 8,
    quote: "Like what you do, and then you will do your best.",
    author: "Katherine Johnson",
    field: "Orbital Mechanics & Mathematics (NASA)",
    context: "On calculation precision and dedication to the craft."
  },
  {
    id: 9,
    quote: "My methods are really methods of working and thinking; this is why they have crept in everywhere anonymously.",
    author: "Emmy Noether",
    field: "Abstract Algebra & Theoretical Physics",
    context: "On the enduring value of learning generalized mental frameworks."
  },
  {
    id: 10,
    quote: "An expert is a person who has made all the mistakes that can be made in a very narrow field.",
    author: "Niels Bohr",
    field: "Atomic Physics (Nobel Laureate)",
    context: "On learning fearlessly from mistakes during practice tests."
  },
  {
    id: 11,
    quote: "If I have seen further, it is by standing on the shoulders of giants.",
    author: "Isaac Newton",
    field: "Mathematics & Physics",
    context: "On leveraging existing proofs and foundational concepts."
  },
  {
    id: 12,
    quote: "However difficult life may seem, there is always something you can do and succeed at.",
    author: "Stephen Hawking",
    field: "Cosmology & Quantum Gravity",
    context: "On resilience in the face of daunting challenges."
  },
  {
    id: 13,
    quote: "The more I learn, the more I realize how much I don't know.",
    author: "Socrates",
    field: "Philosophy & Dialectic Method",
    context: "On remaining humble and hungry for continuous mastery."
  },
  {
    id: 14,
    quote: "Genius is one percent inspiration and ninety-nine percent perspiration.",
    author: "Thomas Edison",
    field: "Applied Physics & Invention",
    context: "On the unmatched value of daily consistent study habits."
  },
  {
    id: 15,
    quote: "The purpose of computing is insight, not numbers.",
    author: "Richard Hamming",
    field: "Applied Mathematics & Information Theory",
    context: "On seeking conceptual depth over mechanical computation."
  },
  {
    id: 16,
    quote: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    author: "Johann Wolfgang von Goethe",
    field: "Natural Philosophy & Literature",
    context: "On testing yourself with active recall rather than passive reading."
  },
  {
    id: 17,
    quote: "You don't understand anything until you learn it in more than one way.",
    author: "Marvin Minsky",
    field: "Artificial Intelligence & Cognitive Science",
    context: "On cross-topic synthesis and multidimensional mental models."
  },
  {
    id: 18,
    quote: "The art of doing mathematics consists in finding that special case which contains all the germs of generality.",
    author: "David Hilbert",
    field: "Mathematics",
    context: "On starting with simple test cases to crack difficult exam questions."
  },
  {
    id: 19,
    quote: "I was born not knowing and have had only a little time to change that here and there.",
    author: "Richard Feynman",
    field: "Quantum Electrodynamics",
    context: "On cherishing the process of discovery."
  },
  {
    id: 20,
    quote: "In mathematics, you don't understand things. You just get used to them.",
    author: "John von Neumann",
    field: "Mathematical Physics & Game Theory",
    context: "On familiarity achieved through repeated active problem solving."
  },
  {
    id: 21,
    quote: "Science is a way of thinking much more than it is a body of knowledge.",
    author: "Carl Sagan",
    field: "Planetary Science",
    context: "On applying first-principles reasoning to every question."
  },
  {
    id: 22,
    quote: "The only way to learn mathematics is to do mathematics.",
    author: "Paul Halmos",
    field: "Mathematics & Logic",
    context: "On hands-on practice quizzes over passive textbook scanning."
  },
  {
    id: 23,
    quote: "Every formula which expresses a law of nature is a hymn of praise to God.",
    author: "Maria Mitchell",
    field: "Astronomy",
    context: "On finding elegance and order in complex physical formulas."
  },
  {
    id: 24,
    quote: "Research is what I'm doing when I don't know what I'm doing.",
    author: "Wernher von Braun",
    field: "Aerospace Engineering",
    context: "On navigating the confusion that precedes true comprehension."
  },
  {
    id: 25,
    quote: "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
    field: "Philosophy",
    context: "On igniting active curiosity in daily revision."
  },
  {
    id: 26,
    quote: "Do not worry about your difficulties in Mathematics. I can assure you mine are still greater.",
    author: "Albert Einstein",
    field: "Theoretical Physics",
    context: "On embracing productive struggle as universal among all thinkers."
  },
  {
    id: 27,
    quote: "A scientist in his laboratory is not a mere technician: he is also a child confronting natural phenomena that impress him like fairy tales.",
    author: "Marie Curie",
    field: "Radiochemistry",
    context: "On preserving childlike enthusiasm during long revision nights."
  },
  {
    id: 28,
    quote: "Simplicity is the prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
    field: "Computer Science",
    context: "On structuring neat, clean derivations and solution steps."
  },
  {
    id: 29,
    quote: "It requires a very unusual mind to undertake the analysis of the obvious.",
    author: "Alfred North Whitehead",
    field: "Mathematical Logic",
    context: "On dissecting fundamental assumptions in tricky exam traps."
  },
  {
    id: 30,
    quote: "What we observe is not nature itself, but nature exposed to our method of questioning.",
    author: "Werner Heisenberg",
    field: "Quantum Mechanics",
    context: "On how the framing of a problem shapes the solution path."
  },
  {
    id: 31,
    quote: "The good thing about science is that it's true whether or not you believe in it.",
    author: "Neil deGrasse Tyson",
    field: "Astrophysics",
    context: "On relying on verifiable facts and methodical validation."
  },
  {
    id: 32,
    quote: "Mathematics is the language with which God has written the universe.",
    author: "Galileo Galilei",
    field: "Astronomy & Physics",
    context: "On using mathematical fluency to unlock natural sciences."
  },
  {
    id: 33,
    quote: "Give me a place to stand, and a lever long enough, and I will move the world.",
    author: "Archimedes",
    field: "Classical Mechanics & Geometry",
    context: "On leveraging high-yield core principles to solve massive problem sets."
  },
  {
    id: 34,
    quote: "Order and simplification are the first steps toward the mastery of a subject.",
    author: "Thomas Mann",
    field: "Literature & Scholarship",
    context: "On consolidating fragmented notes into structured flashcards."
  },
  {
    id: 35,
    quote: "The greatest obstacle to discovery is not ignorance—it is the illusion of knowledge.",
    author: "Daniel J. Boorstin",
    field: "History & Scholarship",
    context: "On using flashcard self-testing to expose hidden weak spots."
  },
  {
    id: 36,
    quote: "The best way to predict your future is to create it.",
    author: "Peter Drucker",
    field: "Management Science",
    context: "On daily micro-habits dictating exam rank outcomes."
  },
  {
    id: 37,
    quote: "Education is not the learning of facts, but the training of the mind to think.",
    author: "Albert Einstein",
    field: "Physics",
    context: "On developing adaptive problem-solving skills."
  },
  {
    id: 38,
    quote: "I am among those who think that science has great beauty.",
    author: "Marie Curie",
    field: "Physics",
    context: "On finding intrinsic motivation in theoretical study."
  },
  {
    id: 39,
    quote: "To know that we know what we know, and that we do not know what we do not know, that is true knowledge.",
    author: "Confucius",
    field: "Philosophy",
    context: "On metacognition and calibration of exam confidence."
  },
  {
    id: 40,
    quote: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.",
    author: "Brian Herbert",
    field: "Literature",
    context: "On choosing consistency each morning."
  },
  {
    id: 41,
    quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
    field: "Scholarship & Philosophy",
    context: "On lifelong curiosity and intellectual enrichment."
  },
  {
    id: 42,
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
    field: "Natural Philosophy & Statesmanship",
    context: "On dedicating time to rigorous self-discipline."
  },
  {
    id: 43,
    quote: "Mathematics reveals its secrets only to those who approach it with pure love, for its own beauty.",
    author: "Archimedes",
    field: "Mathematics",
    context: "On approaching quantitative subjects without dread."
  },
  {
    id: 44,
    quote: "If you cannot explain something in simple terms, you don't understand it completely.",
    author: "Richard Feynman",
    field: "Physics",
    context: "On the Feynman technique for testing your comprehension."
  },
  {
    id: 45,
    quote: "Nature uses only the longest threads to weave her patterns, so that each small piece reveals the organization of the entire tapestry.",
    author: "Richard Feynman",
    field: "Physics",
    context: "On how small fundamental formulas govern giant physical phenomena."
  },
  {
    id: 46,
    quote: "I have no special talent. I am only passionately curious.",
    author: "Albert Einstein",
    field: "Physics",
    context: "On curiosity carrying you past exam frustration."
  },
  {
    id: 47,
    quote: "Truth is much too complicated to allow anything but approximations.",
    author: "John von Neumann",
    field: "Mathematics",
    context: "On using iterative estimation and order-of-magnitude checks."
  },
  {
    id: 48,
    quote: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
    field: "Scholarship",
    context: "On the compounding returns of daily spaced repetition."
  },
  {
    id: 49,
    quote: "The important thing is not to stop questioning. Curiosity has its own reason for existence.",
    author: "Albert Einstein",
    field: "Physics",
    context: "On probing deeper into missed PYQ questions."
  },
  {
    id: 50,
    quote: "There are no shortcuts to any place worth going.",
    author: "Beverly Sills",
    field: "Arts & Academics",
    context: "On building true conceptual foundations rather than memorizing tricks."
  },
  {
    id: 51,
    quote: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma",
    field: "Cognitive Performance",
    context: "On making today's 3 micro-goals non-negotiable."
  },
  {
    id: 52,
    quote: "Energy and persistence conquer all things.",
    author: "Benjamin Franklin",
    field: "Science & Invention",
    context: "On powering through the hardest chapters."
  },
  {
    id: 53,
    quote: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    field: "Philosophy",
    context: "On completing that full syllabus before the deadline."
  },
  {
    id: 54,
    quote: "Don't count the days, make the days count.",
    author: "Muhammad Ali",
    field: "Athletics & Focus",
    context: "On turning countdown anxiety into focused mock paper drills."
  },
  {
    id: 55,
    quote: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
    field: "Creative Geometry & Art",
    context: "On replacing study paralysis with opening the first question."
  },
  {
    id: 56,
    quote: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    field: "Literature",
    context: "On breaking a giant chapter into bite-sized 10-minute focus blocks."
  },
  {
    id: 57,
    quote: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky",
    field: "Performance Psychology",
    context: "On attempting difficult practice questions without fear of low scores."
  },
  {
    id: 58,
    quote: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
    field: "Philosophy",
    context: "On studying even on the days you feel unmotivated."
  },
  {
    id: 59,
    quote: "He who has a why to live can bear almost any how.",
    author: "Friedrich Nietzsche",
    field: "Philosophy",
    context: "On keeping your ultimate academic dream clear in your vision."
  },
  {
    id: 60,
    quote: "Patience and perseverance have a magical effect before which difficulties disappear and obstacles vanish.",
    author: "John Quincy Adams",
    field: "Scholarship",
    context: "On mastering concepts that seemed impenetrable at first glance."
  },
  {
    id: 61,
    quote: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein",
    field: "Physics",
    context: "On seeing weak areas as high-growth score opportunities."
  },
  {
    id: 62,
    quote: "Focus is a muscle; the more you train it, the stronger it gets.",
    author: "Cal Newport",
    field: "Computer Science & Deep Work",
    context: "On eliminating digital distractions during timed study blocks."
  },
  {
    id: 63,
    quote: "To achieve great things, two things are needed; a plan, and not quite enough time.",
    author: "Leonard Bernstein",
    field: "Arts & Academics",
    context: "On channelizing healthy time urgency into razor-sharp focus."
  },
  {
    id: 64,
    quote: "Clarity affords focus.",
    author: "Thomas Leonard",
    field: "Personal Mastery",
    context: "On defining exactly which 3 tasks must get done today."
  },
  {
    id: 65,
    quote: "Well done is better than well said.",
    author: "Benjamin Franklin",
    field: "Science",
    context: "On executing practice questions rather than over-planning."
  },
  {
    id: 66,
    quote: "The harder the conflict, the more glorious the triumph.",
    author: "Thomas Paine",
    field: "Philosophy",
    context: "On the pride of cracking notoriously tough competitive exams."
  },
  {
    id: 67,
    quote: "Do one thing every day that scares you.",
    author: "Eleanor Roosevelt",
    field: "Leadership",
    context: "On tackling your weakest topic first thing in the morning."
  },
  {
    id: 68,
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    field: "Statesmanship",
    context: "On shedding imposter syndrome before your big exam."
  },
  {
    id: 69,
    quote: "A journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
    field: "Philosophy",
    context: "On beginning the first topic of an overwhelming syllabus."
  },
  {
    id: 70,
    quote: "What we do today matters most.",
    author: "Marcus Aurelius",
    field: "Stoic Philosophy",
    context: "On letting go of yesterday's lost hours and seizing the present."
  },
  {
    id: 71,
    quote: "Perfection is not attainable, but if we chase perfection we can catch excellence.",
    author: "Vince Lombardi",
    field: "High Performance",
    context: "On striving for 100% accuracy in calculation drills."
  },
  {
    id: 72,
    quote: "Continuous effort—not strength or intelligence—is the key to unlocking our potential.",
    author: "Winston Churchill",
    field: "History",
    context: "On relentless daily revision beating raw intellect."
  },
  {
    id: 73,
    quote: "Difficulties strengthen the mind, as labor does the body.",
    author: "Seneca",
    field: "Philosophy",
    context: "On seeing difficult numericals as cognitive resistance training."
  },
  {
    id: 74,
    quote: "Either you run the day or the day runs you.",
    author: "Jim Rohn",
    field: "Productivity",
    context: "On setting morning intentions before opening social media."
  },
  {
    id: 75,
    quote: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun",
    field: "Athletics",
    context: "On turning study sessions into automatic subconscious routines."
  },
  {
    id: 76,
    quote: "A person who never made a mistake never tried anything new.",
    author: "Albert Einstein",
    field: "Physics",
    context: "On welcoming incorrect answers in mocks as guides for revision."
  },
  {
    id: 77,
    quote: "I find that the harder I work, the more luck I seem to have.",
    author: "Thomas Jefferson",
    field: "Scholarship",
    context: "On luck favoring the student who solved 1,000 extra PYQs."
  },
  {
    id: 78,
    quote: "Knowledge has a beginning but no end.",
    author: "Geeta Iyengar",
    field: "Philosophy",
    context: "On enjoying the learning curve of your core disciplines."
  },
  {
    id: 79,
    quote: "Don't let what you cannot do interfere with what you can do.",
    author: "John Wooden",
    field: "Performance Coaching",
    context: "On locking down easy and medium questions before stressing on edge cases."
  },
  {
    id: 80,
    quote: "There are two kinds of forecasters: those who don't know, and those who don't know they don't know.",
    author: "John Kenneth Galbraith",
    field: "Economics",
    context: "On rigorously testing your assumptions against empirical answer keys."
  },
  {
    id: 81,
    quote: "One never notices what has been done; one can only see what remains to be done.",
    author: "Marie Curie",
    field: "Physics",
    context: "On balancing healthy ambition with acknowledging your milestones."
  },
  {
    id: 82,
    quote: "Study without desire spoils the memory, and it retains nothing that it takes in.",
    author: "Leonardo da Vinci",
    field: "Polymathy & Anatomical Science",
    context: "On connecting exam questions to real-world mechanical wonder."
  },
  {
    id: 83,
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
    field: "Philosophy & Natural Sciences",
    context: "On enduring exam preparation grind for long-term career fulfillment."
  },
  {
    id: 84,
    quote: "All our dreams can come true, if we have the courage to pursue them.",
    author: "Walt Disney",
    field: "Creative Engineering",
    context: "On daring to aim for top percentile university admissions."
  },
  {
    id: 85,
    quote: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    field: "Music & Art",
    context: "On your intellectual foundation remaining yours for life."
  },
  {
    id: 86,
    quote: "Quality is not an act, it is a habit.",
    author: "Aristotle",
    field: "Philosophy",
    context: "On maintaining neat calculations and clean diagram scratch work."
  },
  {
    id: 87,
    quote: "If you want to shine like a sun, first burn like a sun.",
    author: "A.P.J. Abdul Kalam",
    field: "Aerospace Engineering & Statesmanship",
    context: "On matching your high aspirations with high daily dedication."
  },
  {
    id: 88,
    quote: "You have to dream before your dreams can come true.",
    author: "A.P.J. Abdul Kalam",
    field: "Aerospace Engineering",
    context: "On visualizing exam success to power through late-night fatigue."
  },
  {
    id: 89,
    quote: "Excellence happens not by accident. It is a process.",
    author: "A.P.J. Abdul Kalam",
    field: "Aerospace Engineering",
    context: "On trusting the systematic revision process."
  },
  {
    id: 90,
    quote: "Look at the sky. We are not alone. The whole universe is friendly to us and conspires only to give the best to those who dream and work.",
    author: "A.P.J. Abdul Kalam",
    field: "Aerospace Engineering",
    context: "On peace of mind and inner calm before test day."
  },
  {
    id: 91,
    quote: "The true sign of intelligence is not knowledge but imagination.",
    author: "Albert Einstein",
    field: "Physics",
    context: "On picturing 3D vectors and geometric proofs in your mind's eye."
  },
  {
    id: 92,
    quote: "I am not afraid of storms, for I am learning how to sail my ship.",
    author: "Louisa May Alcott",
    field: "Literature",
    context: "On viewing tough mock tests as practice for navigating real exam pressure."
  },
  {
    id: 93,
    quote: "Real difficulty in life is learning how to overcome our own limitations.",
    author: "Alexander the Great",
    field: "History",
    context: "On defeating procrastination and distraction."
  },
  {
    id: 94,
    quote: "Courage is resistance to fear, mastery of fear—not absence of fear.",
    author: "Mark Twain",
    field: "Literature",
    context: "On calmly stepping into the examination hall."
  },
  {
    id: 95,
    quote: "Great minds have purposes; others have wishes.",
    author: "Washington Irving",
    field: "Scholarship",
    context: "On converting vague wishes into specific daily study quotas."
  },
  {
    id: 96,
    quote: "Do what you can, with what you have, where you are.",
    author: "Theodore Roosevelt",
    field: "Leadership",
    context: "On making the best use of your remaining preparation time."
  },
  {
    id: 97,
    quote: "A smooth sea never made a skilled sailor.",
    author: "Franklin D. Roosevelt",
    field: "History",
    context: "On challenging problem sets building true exam resilience."
  },
  {
    id: 98,
    quote: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    field: "Performance Psychology",
    context: "On diving into that intimidating chapter right now."
  },
  {
    id: 99,
    quote: "The future belongs to those who prepare for it today.",
    author: "Malcolm X",
    field: "Social Philosophy",
    context: "On today's flashcards creating tomorrow's top rank."
  },
  {
    id: 100,
    quote: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs",
    field: "Technology & Design",
    context: "On dedicating yourself fully to your unique goals and passions."
  },
  {
    id: 101,
    quote: "Persistence guarantees that results are inevitable.",
    author: "Paramahansa Yogananda",
    field: "Philosophy",
    context: "On knowing that consistent repetition makes mastery a mathematical certainty."
  },
  {
    id: 102,
    quote: "Everything is theoretically impossible, until it is done.",
    author: "Robert A. Heinlein",
    field: "Science & Engineering Literature",
    context: "On conquering what peers claimed was too hard to solve."
  }
];

/**
 * Returns day-of-year integer (1 - 366) for deterministic daily hashing
 */
export function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Deterministically picks a quote for today based on calendar day
 */
export function getDailyQuote(date = new Date()) {
  const dayOfYear = getDayOfYear(date);
  const index = Math.abs(dayOfYear) % ACADEMIC_QUOTES.length;
  return ACADEMIC_QUOTES[index];
}

/**
 * Returns all available quotes
 */
export function getAllQuotes() {
  return ACADEMIC_QUOTES;
}

export default {
  ACADEMIC_QUOTES,
  getDayOfYear,
  getDailyQuote,
  getAllQuotes
};
