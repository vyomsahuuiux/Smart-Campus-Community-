// Gemini AI Service - Handles AI-powered reading recommendations and Q&A
class GeminiService {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
        this.conversationHistory = [];
        this.isDemo = false;
        this.knowledgeBase = this.buildKnowledgeBase();
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests
    }

    init() {
        this.apiKey = window.APP_CONFIG?.geminiApiKey;
        // Check for missing, placeholder, or invalid API keys (Maps API keys won't work for Gemini)
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY' || !this.apiKey.startsWith('AIza') || this.apiKey === window.APP_CONFIG?.googleMapsApiKey) {
            console.warn('Gemini API key not configured or invalid. AI features will use demo mode.');
            this.isDemo = true;
            return false;
        }
        this.isDemo = false;
        return true;
    }

    // Build knowledge base for offline/demo mode
    buildKnowledgeBase() {
        return {
            books: {
                'computer science': [
                    { title: "Code: The Hidden Language of Computer Hardware and Software", author: "Charles Petzold", description: "🌟 STUDENT FAVORITE - Makes complex computer concepts simple and fascinating through everyday analogies. Perfect for beginners!", category: "beginner", rating: 4.9, difficulty: "Easy" },
                    { title: "Python Crash Course", author: "Eric Matthes", description: "🌟 BEST FOR BEGINNERS - Learn Python through fun, hands-on projects. No prior experience needed!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "Head First Programming", author: "Paul Barry", description: "🎯 Visual, brain-friendly approach to learning programming. Uses pictures, puzzles, and humor!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "The Self-Taught Programmer", author: "Cory Althoff", description: "Written by someone who taught himself - understands student struggles perfectly.", category: "beginner", rating: 4.6, difficulty: "Easy" },
                    { title: "Grokking Algorithms", author: "Aditya Bhargava", description: "🎨 Beautifully illustrated guide to algorithms. Makes complex topics visual and fun!", category: "beginner", rating: 4.9, difficulty: "Easy" }
                ],
                'programming': [
                    { title: "Python Crash Course", author: "Eric Matthes", description: "🌟 #1 BESTSELLER - Build games, visualizations, and web apps while learning. Super engaging!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "Automate the Boring Stuff with Python", author: "Al Sweigart", description: "🎯 FREE ONLINE - Learn by automating real tasks. Practical and immediately useful!", category: "beginner", rating: 4.9, difficulty: "Easy" },
                    { title: "Head First Java", author: "Kathy Sierra", description: "🧠 Brain-friendly learning with visuals, puzzles, and humor. You'll actually enjoy reading it!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "Eloquent JavaScript", author: "Marijn Haverbeke", description: "🆓 FREE ONLINE - Beautiful writing, clear examples. Great for web development beginners.", category: "beginner", rating: 4.6, difficulty: "Easy-Medium" },
                    { title: "Learn Python the Hard Way", author: "Zed Shaw", description: "Short exercises that build skills gradually. Simple and effective approach.", category: "beginner", rating: 4.5, difficulty: "Easy" }
                ],
                'ai': [
                    { title: "AI for Everyone", author: "Andrew Ng (Course)", description: "🌟 EASIEST START - Non-technical introduction to AI. No coding required to understand!", category: "beginner", rating: 4.9, difficulty: "Easy" },
                    { title: "You Look Like a Thing and I Love You", author: "Janelle Shane", description: "😂 HILARIOUS - Learn AI through funny examples of AI fails. Super entertaining!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "The Hundred-Page Machine Learning Book", author: "Andriy Burkov", description: "📖 CONCISE - Everything you need in just 100 pages. Perfect quick introduction!", category: "beginner", rating: 4.7, difficulty: "Easy-Medium" },
                    { title: "Machine Learning for Absolute Beginners", author: "Oliver Theobald", description: "🎯 STUDENT FRIENDLY - Written specifically for complete beginners. No math heavy content!", category: "beginner", rating: 4.6, difficulty: "Easy" },
                    { title: "Grokking Artificial Intelligence Algorithms", author: "Rishal Hurbans", description: "🎨 VISUAL LEARNING - Illustrated guide that makes AI algorithms easy to grasp.", category: "beginner", rating: 4.7, difficulty: "Easy-Medium" }
                ],
                'machine learning': [
                    { title: "Machine Learning for Absolute Beginners", author: "Oliver Theobald", description: "🌟 START HERE - Plain English explanations, no complex math. Perfect first book!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "The Hundred-Page Machine Learning Book", author: "Andriy Burkov", description: "📖 QUICK READ - Covers essentials without overwhelming you. Great for busy students!", category: "beginner", rating: 4.8, difficulty: "Easy-Medium" },
                    { title: "Hands-On Machine Learning", author: "Aurélien Géron", description: "🔧 PRACTICAL - Learn by building real projects. Lots of code examples!", category: "practical", rating: 4.9, difficulty: "Medium" },
                    { title: "Machine Learning Yearning", author: "Andrew Ng", description: "🆓 FREE - Practical tips from the AI pioneer. Short, actionable chapters.", category: "practical", rating: 4.8, difficulty: "Easy-Medium" }
                ],
                'data science': [
                    { title: "Data Science for Beginners", author: "Andrew Park", description: "🌟 PERFECT START - Step-by-step guide with real examples. No prior knowledge needed!", category: "beginner", rating: 4.6, difficulty: "Easy" },
                    { title: "Storytelling with Data", author: "Cole Nussbaumer Knaflic", description: "📊 VISUAL - Learn to make beautiful, effective charts. Practical and inspiring!", category: "practical", rating: 4.9, difficulty: "Easy" },
                    { title: "Python for Data Analysis", author: "Wes McKinney", description: "🐼 FROM THE CREATOR - Learn Pandas from the person who created it!", category: "practical", rating: 4.7, difficulty: "Easy-Medium" },
                    { title: "Naked Statistics", author: "Charles Wheelan", description: "😄 FUN READ - Makes statistics entertaining and easy to understand!", category: "beginner", rating: 4.8, difficulty: "Easy" }
                ],
                'web development': [
                    { title: "HTML & CSS: Design and Build Websites", author: "Jon Duckett", description: "🌟 MOST BEAUTIFUL - Stunning visual design makes learning enjoyable. Highly recommended!", category: "beginner", rating: 4.9, difficulty: "Easy" },
                    { title: "JavaScript & jQuery", author: "Jon Duckett", description: "🎨 VISUAL LEARNING - Same beautiful format. Makes JavaScript approachable!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "Learning Web Design", author: "Jennifer Robbins", description: "📚 COMPREHENSIVE - Everything you need in one friendly book!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "Eloquent JavaScript", author: "Marijn Haverbeke", description: "🆓 FREE ONLINE - Clear writing, great examples. A modern classic!", category: "beginner", rating: 4.6, difficulty: "Easy-Medium" }
                ],
                'business': [
                    { title: "The Personal MBA", author: "Josh Kaufman", description: "🌟 BEST VALUE - Learn business fundamentals without expensive school. Comprehensive!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "Zero to One", author: "Peter Thiel", description: "💡 INSPIRING - Short chapters, big ideas. Every student should read this!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "The Lean Startup", author: "Eric Ries", description: "🚀 PRACTICAL - Learn startup methodology with real examples.", category: "practical", rating: 4.6, difficulty: "Easy" },
                    { title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", description: "💰 EYE-OPENING - Simple lessons about money that school doesn't teach!", category: "beginner", rating: 4.5, difficulty: "Easy" },
                    { title: "Who Moved My Cheese?", author: "Spencer Johnson", description: "📖 QUICK READ - 1 hour read with powerful lessons about change.", category: "beginner", rating: 4.4, difficulty: "Very Easy" }
                ],
                'entrepreneurship': [
                    { title: "The $100 Startup", author: "Chris Guillebeau", description: "🌟 INSPIRING - Real stories of people starting businesses with little money!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "Rework", author: "Jason Fried", description: "⚡ QUICK READ - Short chapters with unconventional but practical advice!", category: "beginner", rating: 4.8, difficulty: "Very Easy" },
                    { title: "The Lean Startup", author: "Eric Ries", description: "🎯 ESSENTIAL - The modern guide to building startups smartly.", category: "practical", rating: 4.6, difficulty: "Easy" },
                    { title: "Start with Why", author: "Simon Sinek", description: "💡 MOTIVATING - Understand why some leaders inspire and others don't.", category: "beginner", rating: 4.7, difficulty: "Easy" }
                ],
                'psychology': [
                    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", description: "🧠 MIND-BLOWING - Nobel winner explains how we really think. Fascinating!", category: "popular", rating: 4.8, difficulty: "Easy-Medium" },
                    { title: "The Power of Habit", author: "Charles Duhigg", description: "🌟 LIFE-CHANGING - Understand and change your habits. Very practical!", category: "popular", rating: 4.7, difficulty: "Easy" },
                    { title: "Influence", author: "Robert Cialdini", description: "🎯 USEFUL - Learn why people say yes. Great for any field!", category: "popular", rating: 4.8, difficulty: "Easy" },
                    { title: "Mindset", author: "Carol S. Dweck", description: "💪 EMPOWERING - How your beliefs shape your success. Must read!", category: "popular", rating: 4.7, difficulty: "Easy" },
                    { title: "Emotional Intelligence", author: "Daniel Goleman", description: "❤️ IMPORTANT - Why EQ matters more than IQ. Easy to understand!", category: "popular", rating: 4.6, difficulty: "Easy" }
                ],
                'science': [
                    { title: "A Short History of Nearly Everything", author: "Bill Bryson", description: "🌟 MOST FUN - Makes science hilarious and fascinating. You'll love it!", category: "popular", rating: 4.9, difficulty: "Easy" },
                    { title: "Cosmos", author: "Carl Sagan", description: "✨ INSPIRING - Beautiful writing about the universe. Poetic science!", category: "popular", rating: 4.8, difficulty: "Easy" },
                    { title: "The Immortal Life of Henrietta Lacks", author: "Rebecca Skloot", description: "📖 GRIPPING - Science story that reads like a novel. Unforgettable!", category: "popular", rating: 4.7, difficulty: "Easy" },
                    { title: "What If?", author: "Randall Munroe", description: "😂 HILARIOUS - Serious scientific answers to absurd questions. So fun!", category: "popular", rating: 4.9, difficulty: "Very Easy" }
                ],
                'physics': [
                    { title: "Six Easy Pieces", author: "Richard Feynman", description: "🌟 CLASSIC - Physics genius explains concepts simply. Short and brilliant!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "A Brief History of Time", author: "Stephen Hawking", description: "🌌 ICONIC - Complex ideas made accessible. A must-read adventure!", category: "popular", rating: 4.7, difficulty: "Easy-Medium" },
                    { title: "The Elegant Universe", author: "Brian Greene", description: "✨ MIND-EXPANDING - String theory for everyone. Wonderfully written!", category: "popular", rating: 4.6, difficulty: "Medium" },
                    { title: "Seven Brief Lessons on Physics", author: "Carlo Rovelli", description: "📖 QUICK READ - Beautiful 80-page intro to physics. Perfect start!", category: "beginner", rating: 4.8, difficulty: "Very Easy" }
                ],
                'mathematics': [
                    { title: "How Not to Be Wrong", author: "Jordan Ellenberg", description: "🌟 FASCINATING - Shows math in everyday life. You'll see the world differently!", category: "popular", rating: 4.8, difficulty: "Easy" },
                    { title: "The Joy of x", author: "Steven Strogatz", description: "😊 ENJOYABLE - Makes math fun and beautiful. Great for math-phobes!", category: "popular", rating: 4.7, difficulty: "Easy" },
                    { title: "How to Solve It", author: "George Pólya", description: "🧠 TIMELESS - Problem-solving strategies that work everywhere!", category: "practical", rating: 4.6, difficulty: "Easy-Medium" },
                    { title: "Humble Pi", author: "Matt Parker", description: "😂 HILARIOUS - Learn math through funny real-world mistakes!", category: "popular", rating: 4.8, difficulty: "Very Easy" }
                ],
                'history': [
                    { title: "Sapiens", author: "Yuval Noah Harari", description: "🌟 MIND-BLOWING - Human history like you've never seen. Everyone's reading it!", category: "popular", rating: 4.9, difficulty: "Easy" },
                    { title: "A Short History of Nearly Everything", author: "Bill Bryson", description: "😄 ENTERTAINING - History and science with humor. Can't put it down!", category: "popular", rating: 4.9, difficulty: "Easy" },
                    { title: "Guns, Germs, and Steel", author: "Jared Diamond", description: "🔍 FASCINATING - Why history unfolded differently in different places.", category: "popular", rating: 4.7, difficulty: "Easy-Medium" },
                    { title: "The Silk Roads", author: "Peter Frankopan", description: "🌍 FRESH PERSPECTIVE - World history from a new angle!", category: "popular", rating: 4.6, difficulty: "Easy-Medium" }
                ],
                'philosophy': [
                    { title: "Sophie's World", author: "Jostein Gaarder", description: "🌟 PERFECT START - Learn philosophy through an exciting story. So engaging!", category: "beginner", rating: 4.8, difficulty: "Easy" },
                    { title: "The Consolations of Philosophy", author: "Alain de Botton", description: "💡 PRACTICAL - How philosophy helps with real-life problems!", category: "popular", rating: 4.7, difficulty: "Easy" },
                    { title: "At the Existentialist Café", author: "Sarah Bakewell", description: "☕ FASCINATING - Philosophy as an exciting human story!", category: "popular", rating: 4.6, difficulty: "Easy" },
                    { title: "Meditations", author: "Marcus Aurelius", description: "📖 TIMELESS - Ancient wisdom for modern life. Short, powerful entries!", category: "classic", rating: 4.8, difficulty: "Easy" }
                ],
                'economics': [
                    { title: "Freakonomics", author: "Steven Levitt", description: "🌟 FUN READ - Economics of everyday life. Eye-opening and entertaining!", category: "popular", rating: 4.8, difficulty: "Easy" },
                    { title: "Naked Economics", author: "Charles Wheelan", description: "👕 NO JARGON - Economics stripped of complexity. Finally makes sense!", category: "beginner", rating: 4.7, difficulty: "Easy" },
                    { title: "The Undercover Economist", author: "Tim Harford", description: "🔍 INTRIGUING - See economics in everyday situations!", category: "popular", rating: 4.6, difficulty: "Easy" },
                    { title: "Basic Economics", author: "Thomas Sowell", description: "📚 CLEAR - No graphs, no jargon. Just clear explanations!", category: "beginner", rating: 4.7, difficulty: "Easy" }
                ],
                'literature': [
                    { title: "1984", author: "George Orwell", description: "🌟 ESSENTIAL - Dystopian classic everyone should read. Thought-provoking!", category: "classic", rating: 4.8, difficulty: "Easy" },
                    { title: "To Kill a Mockingbird", author: "Harper Lee", description: "❤️ HEARTWARMING - Beautiful story about justice and growing up.", category: "classic", rating: 4.8, difficulty: "Easy" },
                    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", description: "✨ CLASSIC - Short, beautifully written. Perfect for students!", category: "classic", rating: 4.5, difficulty: "Easy" },
                    { title: "Animal Farm", author: "George Orwell", description: "📖 QUICK READ - Political allegory that's easy and impactful!", category: "classic", rating: 4.6, difficulty: "Very Easy" }
                ],
                'self-help': [
                    { title: "Atomic Habits", author: "James Clear", description: "🌟 #1 BESTSELLER - Small habits, big results. Super practical and easy!", category: "popular", rating: 4.9, difficulty: "Easy" },
                    { title: "The 7 Habits of Highly Effective People", author: "Stephen Covey", description: "📚 TIMELESS - Life-changing principles. A classic for a reason!", category: "popular", rating: 4.7, difficulty: "Easy" },
                    { title: "Deep Work", author: "Cal Newport", description: "🎯 PRACTICAL - How to focus in a distracted world. Essential for students!", category: "practical", rating: 4.8, difficulty: "Easy" },
                    { title: "The Subtle Art of Not Giving a F*ck", author: "Mark Manson", description: "😂 REFRESHING - Counter-intuitive advice delivered with humor!", category: "popular", rating: 4.6, difficulty: "Very Easy" },
                    { title: "How to Win Friends and Influence People", author: "Dale Carnegie", description: "🤝 TIMELESS - Social skills that actually work. Simple but powerful!", category: "classic", rating: 4.7, difficulty: "Easy" }
                ],
                'fiction': [
                    { title: "The Alchemist", author: "Paulo Coelho", description: "🌟 INSPIRATIONAL - Beautiful fable about following your dreams. Quick read!", category: "popular", rating: 4.7, difficulty: "Very Easy" },
                    { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", description: "😂 HILARIOUS - Sci-fi comedy that's pure fun. You'll laugh out loud!", category: "sci-fi", rating: 4.8, difficulty: "Easy" },
                    { title: "Harry Potter Series", author: "J.K. Rowling", description: "✨ MAGICAL - If you haven't read it, start now! Engaging and fun!", category: "fantasy", rating: 4.9, difficulty: "Easy" },
                    { title: "The Kite Runner", author: "Khaled Hosseini", description: "💔 MOVING - Powerful story of friendship. You won't forget it!", category: "literary", rating: 4.7, difficulty: "Easy" },
                    { title: "Ready Player One", author: "Ernest Cline", description: "🎮 FUN - Perfect for gamers and pop culture fans!", category: "sci-fi", rating: 4.5, difficulty: "Easy" }
                ],
                'health': [
                    { title: "Why We Sleep", author: "Matthew Walker", description: "🌟 LIFE-CHANGING - Will completely change how you view sleep!", category: "science", rating: 4.8, difficulty: "Easy" },
                    { title: "The Body", author: "Bill Bryson", description: "😄 FASCINATING - Your body explained with humor. So interesting!", category: "popular", rating: 4.8, difficulty: "Easy" },
                    { title: "Atomic Habits", author: "James Clear", description: "💪 PRACTICAL - Build healthy habits that stick!", category: "practical", rating: 4.9, difficulty: "Easy" },
                    { title: "How Not to Die", author: "Michael Greger", description: "🥗 EYE-OPENING - Evidence-based nutrition made simple.", category: "nutrition", rating: 4.6, difficulty: "Easy" }
                ],
                'environment': [
                    { title: "The Sixth Extinction", author: "Elizabeth Kolbert", description: "🌍 IMPORTANT - Pulitzer-winning. Urgent and readable!", category: "science", rating: 4.7, difficulty: "Easy-Medium" },
                    { title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", description: "🌿 BEAUTIFUL - Indigenous wisdom meets science. Poetic!", category: "popular", rating: 4.9, difficulty: "Easy" },
                    { title: "The Uninhabitable Earth", author: "David Wallace-Wells", description: "🔥 URGENT - Climate change explained clearly. Wake-up call!", category: "current", rating: 4.5, difficulty: "Easy" },
                    { title: "Drawdown", author: "Paul Hawken", description: "💡 HOPEFUL - 100 solutions to climate change. Actionable!", category: "solutions", rating: 4.6, difficulty: "Easy" }
                ]
            },
            qaDatabase: {
                greetings: ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"],
                thanks: ["thank you", "thanks", "appreciate", "grateful"],
                help: ["help", "what can you do", "how do you work", "what are you"],
                study: ["how to study", "study tips", "study techniques", "effective studying", "exam preparation"],
                career: ["career advice", "job search", "interview tips", "resume", "career path"],
                writing: ["how to write", "writing tips", "essay writing", "academic writing", "research paper"],
                time: ["time management", "productivity", "organize time", "schedule"]
            }
        };
    }

    // Detect query type
    detectQueryType(query) {
        const queryLower = query.toLowerCase();
        
        // Check for greetings
        if (this.knowledgeBase.qaDatabase.greetings.some(g => queryLower.includes(g)) && queryLower.length < 20) {
            return 'greeting';
        }
        
        // Check for thanks
        if (this.knowledgeBase.qaDatabase.thanks.some(t => queryLower.includes(t))) {
            return 'thanks';
        }
        
        // Check for help request
        if (this.knowledgeBase.qaDatabase.help.some(h => queryLower.includes(h))) {
            return 'help';
        }
        
        // Check for "what is" or "explain" questions
        if (queryLower.startsWith('what is') || queryLower.startsWith('what are') || 
            queryLower.startsWith('explain') || queryLower.startsWith('define') ||
            queryLower.startsWith('tell me about') || queryLower.startsWith('how does') ||
            queryLower.startsWith('why') || queryLower.startsWith('how do') ||
            queryLower.includes('meaning of') || queryLower.includes('what does')) {
            return 'explain';
        }
        
        // Check for study tips
        if (this.knowledgeBase.qaDatabase.study.some(s => queryLower.includes(s))) {
            return 'study';
        }
        
        // Check for career advice
        if (this.knowledgeBase.qaDatabase.career.some(c => queryLower.includes(c))) {
            return 'career';
        }
        
        // Check for writing help
        if (this.knowledgeBase.qaDatabase.writing.some(w => queryLower.includes(w))) {
            return 'writing';
        }
        
        // Check for time management
        if (this.knowledgeBase.qaDatabase.time.some(t => queryLower.includes(t))) {
            return 'time';
        }
        
        // Check for book recommendations
        if (queryLower.includes('book') || queryLower.includes('recommend') || queryLower.includes('read') || queryLower.includes('suggest')) {
            return 'books';
        }
        
        // Check for specific topics (likely book request)
        const topics = Object.keys(this.knowledgeBase.books);
        for (const topic of topics) {
            if (queryLower.includes(topic)) {
                return 'explain';
            }
        }
        
        // Default to general question
        return 'explain';
    }

    // Knowledge base for explanations
    getExplanation(topic) {
        const explanations = {
            'ai': {
                title: 'Artificial Intelligence (AI)',
                explanation: `**Artificial Intelligence (AI)** is a branch of computer science focused on creating systems that can perform tasks that typically require human intelligence.

**Key Concepts:**

🧠 **Machine Learning** - AI systems that learn from data without being explicitly programmed. They improve their performance over time.

🔮 **Deep Learning** - A subset of ML using neural networks with multiple layers, inspired by the human brain structure.

🗣️ **Natural Language Processing (NLP)** - Enables computers to understand, interpret, and generate human language.

👁️ **Computer Vision** - Allows machines to interpret and understand visual information from the world.

🤖 **Robotics** - Combines AI with physical machines to perform tasks in the real world.

**Types of AI:**
• **Narrow AI** - Designed for specific tasks (like Siri, chess engines)
• **General AI** - Hypothetical AI with human-like reasoning (not yet achieved)
• **Super AI** - Theoretical AI surpassing human intelligence

**Real-World Applications:**
• Virtual assistants (Alexa, Google Assistant)
• Self-driving cars
• Medical diagnosis
• Recommendation systems (Netflix, Spotify)
• Fraud detection in banking`,
                relatedTopics: ['machine learning', 'ai']
            },
            'machine learning': {
                title: 'Machine Learning',
                explanation: `**Machine Learning (ML)** is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.

**How It Works:**

📊 **Training Data** - ML models learn patterns from large datasets
🔄 **Algorithm** - Mathematical methods that find patterns in data
📈 **Model** - The trained system that makes predictions

**Types of Machine Learning:**

1️⃣ **Supervised Learning**
   • Learns from labeled data
   • Examples: spam detection, image classification
   • Algorithms: Linear Regression, Decision Trees, Neural Networks

2️⃣ **Unsupervised Learning**
   • Finds patterns in unlabeled data
   • Examples: customer segmentation, anomaly detection
   • Algorithms: K-Means Clustering, PCA

3️⃣ **Reinforcement Learning**
   • Learns through trial and error
   • Examples: game playing, robotics
   • Used in: AlphaGo, self-driving cars

**Popular Tools & Frameworks:**
• Python (most popular language)
• TensorFlow, PyTorch (deep learning)
• Scikit-learn (classical ML)
• Jupyter Notebooks (experimentation)`,
                relatedTopics: ['machine learning', 'ai', 'data science']
            },
            'data science': {
                title: 'Data Science',
                explanation: `**Data Science** is an interdisciplinary field that uses scientific methods, algorithms, and systems to extract insights from structured and unstructured data.

**The Data Science Process:**

1️⃣ **Data Collection** - Gathering data from various sources
2️⃣ **Data Cleaning** - Handling missing values, removing duplicates
3️⃣ **Exploratory Data Analysis** - Understanding patterns and relationships
4️⃣ **Feature Engineering** - Creating meaningful variables
5️⃣ **Modeling** - Building predictive or descriptive models
6️⃣ **Evaluation** - Testing model performance
7️⃣ **Deployment** - Putting models into production

**Essential Skills:**

📊 **Statistics** - Probability, hypothesis testing, regression
💻 **Programming** - Python, R, SQL
📈 **Visualization** - Matplotlib, Tableau, Power BI
🧠 **Machine Learning** - Algorithms and model building
🗄️ **Big Data** - Handling large datasets with Spark, Hadoop

**Career Paths:**
• Data Scientist
• Data Analyst
• Machine Learning Engineer
• Business Intelligence Analyst
• Data Engineer`,
                relatedTopics: ['data science', 'machine learning', 'programming']
            },
            'python': {
                title: 'Python Programming',
                explanation: `**Python** is a high-level, interpreted programming language known for its simplicity and versatility.

**Why Python is Popular:**

✨ **Easy to Learn** - Clean, readable syntax close to English
🔧 **Versatile** - Web dev, AI, data science, automation
📚 **Rich Libraries** - Thousands of packages for any task
👥 **Large Community** - Extensive support and resources

**Key Features:**
• Dynamic typing
• Object-oriented programming
• Functional programming support
• Cross-platform compatibility

**Popular Use Cases:**

🌐 **Web Development** - Django, Flask, FastAPI
🤖 **AI/ML** - TensorFlow, PyTorch, Scikit-learn
📊 **Data Science** - Pandas, NumPy, Matplotlib
🔄 **Automation** - Scripts, web scraping, testing
🎮 **Game Development** - Pygame

**Getting Started:**
\`\`\`python
# Hello World in Python
print("Hello, World!")

# Variables and data types
name = "Student"
age = 20
gpa = 3.8

# Simple function
def greet(name):
    return f"Hello, {name}!"
\`\`\``,
                relatedTopics: ['programming', 'computer science']
            },
            'programming': {
                title: 'Programming',
                explanation: `**Programming** is the process of creating instructions that tell a computer how to perform specific tasks.

**Fundamental Concepts:**

📝 **Variables** - Containers for storing data values
🔄 **Control Flow** - If/else statements, loops
📦 **Functions** - Reusable blocks of code
🗂️ **Data Structures** - Arrays, lists, dictionaries, trees
🧩 **Algorithms** - Step-by-step problem-solving procedures
🏗️ **Object-Oriented Programming** - Classes, objects, inheritance

**Popular Programming Languages:**

1️⃣ **Python** - AI, data science, web, scripting
2️⃣ **JavaScript** - Web development, frontend & backend
3️⃣ **Java** - Enterprise apps, Android development
4️⃣ **C++** - Systems programming, game development
5️⃣ **C#** - Game dev (Unity), Windows apps
6️⃣ **Go** - Cloud services, microservices
7️⃣ **Rust** - Systems programming, safety-critical apps

**Learning Path for Beginners:**
1. Choose one language (Python recommended)
2. Learn syntax and basic concepts
3. Practice with small projects
4. Learn data structures & algorithms
5. Build real projects
6. Contribute to open source`,
                relatedTopics: ['programming', 'computer science', 'web development']
            },
            'web development': {
                title: 'Web Development',
                explanation: `**Web Development** is the process of building and maintaining websites and web applications.

**Frontend vs Backend:**

🎨 **Frontend (Client-Side)**
What users see and interact with:
• HTML - Structure
• CSS - Styling
• JavaScript - Interactivity
• Frameworks: React, Vue, Angular

⚙️ **Backend (Server-Side)**
Behind-the-scenes logic:
• Server languages: Node.js, Python, Java, PHP
• Databases: MySQL, PostgreSQL, MongoDB
• APIs: REST, GraphQL
• Frameworks: Express, Django, Spring

🔗 **Full-Stack**
Combines both frontend and backend skills

**Modern Web Development Stack:**

**MERN Stack:**
• MongoDB (database)
• Express.js (backend)
• React (frontend)
• Node.js (runtime)

**Essential Tools:**
• Git/GitHub - Version control
• VS Code - Code editor
• Chrome DevTools - Debugging
• npm/yarn - Package managers

**Career Paths:**
• Frontend Developer
• Backend Developer
• Full-Stack Developer
• DevOps Engineer
• UI/UX Developer`,
                relatedTopics: ['web development', 'programming']
            },
            'psychology': {
                title: 'Psychology',
                explanation: `**Psychology** is the scientific study of mind and behavior, examining how people think, feel, and act.

**Major Branches:**

🧠 **Cognitive Psychology**
Studies mental processes: memory, attention, perception, problem-solving

💭 **Clinical Psychology**
Diagnosis and treatment of mental disorders

👶 **Developmental Psychology**
How people change throughout their lifespan

👥 **Social Psychology**
How people influence and relate to each other

🏢 **Industrial-Organizational Psychology**
Psychology in the workplace

🧬 **Biological Psychology**
Brain and nervous system's role in behavior

**Key Concepts:**

📊 **Nature vs Nurture** - Genetics vs environment
🔄 **Classical Conditioning** - Pavlov's dogs
🎯 **Operant Conditioning** - Rewards and punishments
🧩 **Cognitive Biases** - Systematic thinking errors
💡 **Growth Mindset** - Belief in ability to improve

**Influential Psychologists:**
• Sigmund Freud - Psychoanalysis
• B.F. Skinner - Behaviorism
• Carl Rogers - Humanistic psychology
• Daniel Kahneman - Behavioral economics`,
                relatedTopics: ['psychology', 'science']
            },
            'business': {
                title: 'Business & Management',
                explanation: `**Business** encompasses all activities involved in providing goods and services to consumers for profit.

**Core Business Functions:**

📊 **Marketing** - Understanding and reaching customers
💰 **Finance** - Managing money and investments
👥 **Human Resources** - Managing people
⚙️ **Operations** - Producing goods/services efficiently
📈 **Strategy** - Long-term planning and competitive advantage

**Key Business Concepts:**

💡 **Value Proposition** - Why customers choose you
🎯 **Target Market** - Specific customer segments
💵 **Revenue Streams** - How you make money
📉 **Cost Structure** - Your business expenses
🤝 **Competitive Advantage** - What makes you unique

**Business Models:**
• B2B (Business to Business)
• B2C (Business to Consumer)
• Subscription model
• Freemium model
• Platform/Marketplace

**Essential Skills for Business:**
• Financial literacy
• Communication
• Leadership
• Problem-solving
• Negotiation
• Data analysis`,
                relatedTopics: ['business', 'entrepreneurship']
            },
            'entrepreneurship': {
                title: 'Entrepreneurship',
                explanation: `**Entrepreneurship** is the process of starting and running a new business, taking on financial risks in hopes of profit.

**The Startup Journey:**

1️⃣ **Ideation** - Finding a problem worth solving
2️⃣ **Validation** - Testing if people want your solution
3️⃣ **MVP** - Building a Minimum Viable Product
4️⃣ **Launch** - Going to market
5️⃣ **Growth** - Scaling the business
6️⃣ **Exit** - IPO, acquisition, or sustainable business

**Key Startup Concepts:**

🎯 **Product-Market Fit** - When your product satisfies market demand
📈 **Growth Hacking** - Creative, low-cost growth strategies
💰 **Fundraising** - Bootstrapping, Angels, VCs
🔄 **Pivot** - Changing direction based on learnings
📊 **Metrics** - CAC, LTV, MRR, Churn rate

**Types of Funding:**
• Bootstrapping (self-funded)
• Friends & Family
• Angel Investors
• Venture Capital
• Crowdfunding

**Famous Startup Success Stories:**
• Apple - Started in a garage
• Amazon - Started selling books online
• Airbnb - Renting air mattresses
• Uber - Solving transportation`,
                relatedTopics: ['entrepreneurship', 'business']
            },
            'blockchain': {
                title: 'Blockchain Technology',
                explanation: `**Blockchain** is a distributed, decentralized digital ledger that records transactions across many computers.

**How Blockchain Works:**

🔗 **Blocks** - Groups of transactions bundled together
⛓️ **Chain** - Blocks linked using cryptographic hashes
🌐 **Distributed** - Copies stored on many computers
🔒 **Immutable** - Once recorded, cannot be altered

**Key Features:**
• Decentralization - No central authority
• Transparency - All transactions visible
• Security - Cryptographically secured
• Immutability - Tamper-resistant

**Types of Blockchain:**
• **Public** - Open to everyone (Bitcoin, Ethereum)
• **Private** - Restricted access (enterprise use)
• **Consortium** - Partially decentralized

**Applications:**

💰 **Cryptocurrency** - Bitcoin, Ethereum
📜 **Smart Contracts** - Self-executing agreements
🎨 **NFTs** - Digital ownership proof
🏦 **DeFi** - Decentralized finance
📦 **Supply Chain** - Tracking goods
🗳️ **Voting** - Secure voting systems`,
                relatedTopics: ['technology', 'computer science']
            },
            'economics': {
                title: 'Economics',
                explanation: `**Economics** is the social science that studies how people allocate scarce resources to satisfy unlimited wants.

**Two Main Branches:**

📈 **Microeconomics**
Studies individual decision-making:
• Supply and demand
• Consumer behavior
• Market structures
• Pricing strategies

🌍 **Macroeconomics**
Studies the economy as a whole:
• GDP and economic growth
• Inflation and unemployment
• Monetary and fiscal policy
• International trade

**Fundamental Concepts:**

⚖️ **Supply & Demand** - Price determined by market forces
💰 **Opportunity Cost** - Value of next best alternative
📊 **Marginal Analysis** - Benefits vs costs of one more unit
🔄 **Elasticity** - How quantity responds to price changes
🏦 **Monetary Policy** - Central bank controls money supply

**Economic Systems:**
• Capitalism - Private ownership, free markets
• Socialism - Government ownership of production
• Mixed Economy - Combination of both

**Important Indicators:**
• GDP (Gross Domestic Product)
• Inflation Rate
• Unemployment Rate
• Interest Rates`,
                relatedTopics: ['economics', 'business']
            },
            'history': {
                title: 'History',
                explanation: `**History** is the study of past events, particularly human affairs, and how they have shaped our present world.

**Major Historical Periods:**

🏛️ **Ancient History** (3000 BCE - 500 CE)
• Mesopotamian civilizations
• Ancient Egypt, Greece, Rome
• Birth of major religions

🏰 **Medieval Period** (500 - 1500)
• Rise of feudalism
• Islamic Golden Age
• Crusades and Black Death

🎨 **Early Modern** (1500 - 1800)
• Renaissance and Reformation
• Age of Exploration
• Scientific Revolution

🏭 **Modern History** (1800 - present)
• Industrial Revolution
• World Wars
• Digital Age

**Why Study History?**

📚 Understand how we got here
🔮 Learn from past mistakes
🌍 Appreciate different cultures
🧠 Develop critical thinking
🗣️ Better understand current events

**Historical Methods:**
• Primary sources (original documents)
• Secondary sources (interpretations)
• Archaeological evidence
• Oral histories`,
                relatedTopics: ['history']
            },
            'philosophy': {
                title: 'Philosophy',
                explanation: `**Philosophy** is the study of fundamental questions about existence, knowledge, values, reason, and reality.

**Major Branches:**

🤔 **Metaphysics** - Nature of reality
What exists? What is consciousness?

📚 **Epistemology** - Theory of knowledge
What can we know? How do we know it?

⚖️ **Ethics** - Moral philosophy
What is right and wrong? How should we live?

🎨 **Aesthetics** - Philosophy of art
What is beauty? What is art?

🗣️ **Logic** - Principles of reasoning
What makes an argument valid?

**Major Philosophical Schools:**

• **Stoicism** - Focus on what you can control
• **Existentialism** - Individual freedom and responsibility
• **Utilitarianism** - Greatest good for greatest number
• **Pragmatism** - Truth is what works
• **Rationalism** - Knowledge through reason
• **Empiricism** - Knowledge through experience

**Famous Philosophers:**
• Socrates, Plato, Aristotle (Ancient Greek)
• Immanuel Kant (Enlightenment)
• Friedrich Nietzsche (Existentialism)
• John Stuart Mill (Utilitarianism)`,
                relatedTopics: ['philosophy']
            },
            'science': {
                title: 'Science',
                explanation: `**Science** is the systematic study of the natural world through observation, experimentation, and evidence-based reasoning.

**The Scientific Method:**

1️⃣ **Observation** - Notice something interesting
2️⃣ **Question** - Ask why or how
3️⃣ **Hypothesis** - Propose an explanation
4️⃣ **Experiment** - Test the hypothesis
5️⃣ **Analysis** - Examine the results
6️⃣ **Conclusion** - Accept, reject, or modify hypothesis

**Major Scientific Disciplines:**

🔬 **Physics** - Matter, energy, space, time
🧪 **Chemistry** - Composition and reactions of substances
🧬 **Biology** - Living organisms
🌍 **Earth Science** - Geology, meteorology, oceanography
🔭 **Astronomy** - Space and celestial objects

**Key Scientific Concepts:**
• Theory vs Law vs Hypothesis
• Peer review and reproducibility
• Control groups in experiments
• Correlation vs causation

**Revolutionary Scientific Ideas:**
• Evolution by natural selection
• Theory of relativity
• Quantum mechanics
• Big Bang theory
• DNA and genetics`,
                relatedTopics: ['science', 'physics']
            },
            'physics': {
                title: 'Physics',
                explanation: `**Physics** is the natural science that studies matter, energy, and the fundamental forces of nature.

**Classical Physics:**

⚙️ **Mechanics** - Motion and forces
• Newton's Laws of Motion
• Conservation of energy and momentum

🌡️ **Thermodynamics** - Heat and energy transfer
• Laws of thermodynamics
• Entropy and disorder

⚡ **Electromagnetism** - Electric and magnetic phenomena
• Maxwell's equations
• Light as electromagnetic wave

**Modern Physics:**

🌌 **Relativity** (Einstein)
• Special relativity - Time dilation, E=mc²
• General relativity - Gravity as curved spacetime

⚛️ **Quantum Mechanics**
• Wave-particle duality
• Uncertainty principle
• Quantum superposition

**Key Concepts:**
• Force = mass × acceleration
• Energy cannot be created or destroyed
• Speed of light is constant
• Matter and energy are equivalent

**Applications:**
• Electronics and computers
• Medical imaging (MRI, X-rays)
• Nuclear energy
• GPS satellites
• Lasers`,
                relatedTopics: ['physics', 'science', 'mathematics']
            },
            'mathematics': {
                title: 'Mathematics',
                explanation: `**Mathematics** is the abstract science of numbers, quantities, shapes, and patterns.

**Core Branches:**

🔢 **Arithmetic** - Basic operations (+, -, ×, ÷)
📐 **Geometry** - Shapes, sizes, positions
📊 **Algebra** - Equations and unknown variables
📈 **Calculus** - Change and motion
📉 **Statistics** - Data analysis and probability

**Key Mathematical Concepts:**

📏 **Numbers**
• Natural, integers, rational, real, complex

🔄 **Functions**
• Input-output relationships
• f(x) = x² + 2x + 1

📐 **Geometry**
• Euclidean and non-Euclidean
• Trigonometry

∫ **Calculus**
• Derivatives (rates of change)
• Integrals (accumulation)

📊 **Probability & Statistics**
• Probability distributions
• Hypothesis testing

**Why Math Matters:**
• Foundation for all sciences
• Develops logical thinking
• Essential for technology
• Used in everyday decisions

**Career Applications:**
• Data Science, Finance, Engineering
• Computer Science, Physics, Economics`,
                relatedTopics: ['mathematics', 'science']
            }
        };

        // Find matching explanation
        const topicLower = topic.toLowerCase();
        for (const [key, value] of Object.entries(explanations)) {
            if (topicLower.includes(key) || key.includes(topicLower)) {
                return value;
            }
        }
        
        return null;
    }

    // Extract the topic from a question
    extractQuestionTopic(query) {
        const queryLower = query.toLowerCase();
        
        // Remove question words
        let topic = queryLower
            .replace(/^(what is|what are|what's|explain|define|tell me about|how does|how do|why is|why are|what does)\s*/i, '')
            .replace(/\?$/, '')
            .replace(/^(a|an|the)\s+/i, '')
            .trim();
        
        return topic;
    }

    // Generate reading recommendations
    async getReadingRecommendations(userQuery, userContext = {}) {
        const systemPrompt = this.buildSystemPrompt(userContext);
        const prompt = `${systemPrompt}\n\nUser Query: ${userQuery}\n\nProvide personalized reading recommendations based on the query. Format your response as follows:
        
1. A brief introduction (1-2 sentences)
2. 3-5 book/article recommendations with:
   - Title
   - Author
   - Brief description (1-2 sentences)
   - Why it's relevant to the query
3. A closing suggestion for further exploration

Make recommendations educational and appropriate for college students.`;

        try {
            // Use demo mode if API key is not valid
            if (this.isDemo) {
                // Add a small delay to simulate API response
                await new Promise(resolve => setTimeout(resolve, 800));
                return this.getDemoResponse(userQuery);
            }

            // Rate limiting - ensure minimum interval between requests
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.minRequestInterval) {
                await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
            }
            this.lastRequestTime = Date.now();

            // Try with retry on rate limit
            let response = await this.makeApiRequest(prompt);
            
            // If rate limited, wait and retry once
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                response = await this.makeApiRequest(prompt);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Gemini API error:', response.status, errorData);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                this.conversationHistory.push({ role: 'user', content: userQuery });
                this.conversationHistory.push({ role: 'assistant', content: text });
                return this.formatResponse(text);
            }

            throw new Error('Invalid API response format');
        } catch (error) {
            console.error('Gemini API error:', error);
            // Fallback to demo response on any error
            return this.getDemoResponse(userQuery);
        }
    }

    // Make API request
    async makeApiRequest(prompt) {
        return await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            })
        });
    }

    // Build system prompt with user context
    buildSystemPrompt(userContext) {
        let prompt = `You are an AI Reading Curator for a university campus. Your role is to recommend educational books, articles, research papers, and online resources to students.`;
        
        if (userContext.major) {
            prompt += ` The student is studying ${userContext.major}.`;
        }
        if (userContext.year) {
            prompt += ` They are a ${userContext.year} year student.`;
        }
        if (userContext.interests && userContext.interests.length > 0) {
            prompt += ` Their interests include: ${userContext.interests.join(', ')}.`;
        }
        
        prompt += ` Provide thoughtful, educational recommendations that are appropriate for college-level readers.`;
        
        return prompt;
    }

    // Format response with structured book cards
    formatResponse(text) {
        // Parse the response and extract book recommendations
        const books = this.parseBooks(text);
        
        return {
            message: text,
            books: books,
            timestamp: new Date().toISOString()
        };
    }

    // Parse book recommendations from text
    parseBooks(text) {
        const books = [];
        const bookPatterns = [
            /[""]([^""]+)[""]\s+by\s+([^.\n]+)/gi,
            /\*\*([^*]+)\*\*\s+by\s+([^.\n]+)/gi,
            /Title:\s*([^\n]+)[\s\S]*?Author:\s*([^\n]+)/gi
        ];

        // Try different patterns to extract book info
        for (const pattern of bookPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const existingBook = books.find(b => 
                    b.title.toLowerCase() === match[1].trim().toLowerCase()
                );
                if (!existingBook) {
                    books.push({
                        title: match[1].trim(),
                        author: match[2].trim(),
                        description: this.extractDescription(text, match[1])
                    });
                }
            }
            if (books.length >= 3) break;
        }

        return books;
    }

    // Extract description for a book from surrounding text
    extractDescription(text, bookTitle) {
        const titleIndex = text.toLowerCase().indexOf(bookTitle.toLowerCase());
        if (titleIndex === -1) return '';
        
        // Get text after the title, up to 200 characters or next title
        const afterTitle = text.substring(titleIndex + bookTitle.length, titleIndex + bookTitle.length + 300);
        const sentences = afterTitle.split(/[.!?]/);
        
        if (sentences.length > 1) {
            return sentences.slice(0, 2).join('. ').trim() + '.';
        }
        return sentences[0]?.trim() || '';
    }

    // Demo response when API key is not configured
    getDemoResponse(query) {
        const queryType = this.detectQueryType(query);
        const queryLower = query.toLowerCase();
        
        let response = {
            message: '',
            books: [],
            timestamp: new Date().toISOString()
        };

        switch (queryType) {
            case 'greeting':
                response.message = `Hello! 👋 I'm your Smart Campus Reading Curator. I can help you with:\n\n• **Book Recommendations** - Just tell me a topic you're interested in\n• **Explain Concepts** - Ask "What is AI?" or "Explain machine learning"\n• **Study Tips** - Ask me about effective study techniques\n• **Career Advice** - Get guidance on career paths\n• **General Questions** - I'll do my best to help!\n\nWhat would you like to explore today?`;
                break;
                
            case 'thanks':
                response.message = `You're welcome! 😊 I'm always here to help. Feel free to ask me for more book recommendations or any other questions you might have. Happy learning!`;
                break;
                
            case 'help':
                response.message = `I'm your AI-powered Reading Curator! Here's what I can do:\n\n📚 **Book Recommendations**\nTell me a subject like "computer science", "psychology", "business", or any topic, and I'll suggest relevant books.\n\n❓ **Answer Questions**\nAsk me "What is AI?" or "Explain blockchain" and I'll explain the concept in detail.\n\n📖 **Study Help**\nAsk me about study techniques, time management, or exam preparation.\n\n💼 **Career Guidance**\nI can suggest resources for career development and professional growth.\n\n**Try asking:**\n• "What is machine learning?"\n• "Explain blockchain"\n• "Recommend books about psychology"\n• "How should I study for exams?"`;
                break;
                
            case 'explain':
                // Handle explanation queries
                const topic = this.extractQuestionTopic(query);
                const explanation = this.getExplanation(topic);
                
                if (explanation) {
                    response.message = `## ${explanation.title}\n\n${explanation.explanation}\n\n---\n\n📚 **Want to learn more? Here are some recommended books:**`;
                    response.books = this.findMatchingBooks(explanation.relatedTopics.join(' '));
                } else {
                    // Generic response for unknown topics
                    response.message = `That's an interesting question about **${topic}**!\n\nWhile I don't have detailed information on this specific topic in my knowledge base, I can suggest some general resources that might help you explore this subject further.\n\n💡 **Tip:** Try searching for this topic on:\n• Wikipedia for a general overview\n• Google Scholar for academic papers\n• YouTube for video explanations\n• Coursera/edX for structured courses\n\n📚 **Here are some books that might be relevant:**`;
                    response.books = this.findMatchingBooks(topic) || [
                        { title: "How to Read a Book", author: "Mortimer J. Adler", description: "Master the art of analytical reading to understand any subject deeply." },
                        { title: "A Short History of Nearly Everything", author: "Bill Bryson", description: "An entertaining journey through science that makes complex topics accessible." },
                        { title: "The Art of Thinking Clearly", author: "Rolf Dobelli", description: "Learn to think better and make smarter decisions." }
                    ];
                }
                break;
                
            case 'study':
                response.message = `## Effective Study Techniques 📖\n\nHere are some proven study techniques backed by cognitive science:\n\n**📌 Active Recall**\nTest yourself instead of passive re-reading. Use flashcards or practice questions. This strengthens memory pathways.\n\n**📌 Spaced Repetition**\nReview material at increasing intervals (1 day, 3 days, 1 week, etc.). Apps like Anki can help automate this.\n\n**📌 Pomodoro Technique**\nStudy for 25 minutes, take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.\n\n**📌 Feynman Technique**\nExplain concepts in simple terms as if teaching someone else. This reveals gaps in your understanding.\n\n**📌 Mind Mapping**\nCreate visual diagrams connecting related concepts. Great for subjects with many interconnected ideas.\n\n**📌 Interleaving**\nMix different topics or problem types rather than focusing on one thing. This improves long-term retention.\n\n---\n\n📚 **Recommended books on learning effectively:**`;
                response.books = [
                    { title: "Make It Stick", author: "Peter C. Brown", description: "The science of successful learning based on cognitive psychology research." },
                    { title: "A Mind for Numbers", author: "Barbara Oakley", description: "How to excel at math and science (applies to any subject)." },
                    { title: "Deep Work", author: "Cal Newport", description: "Rules for focused success in a distracted world." },
                    { title: "Ultralearning", author: "Scott Young", description: "Master hard skills, outsmart the competition, and accelerate your career." }
                ];
                break;
                
            case 'career':
                response.message = `## Career Advice for Students 💼\n\nHere's comprehensive career guidance to help you succeed:\n\n**💡 Build Your Skills Early**\n• Develop both technical skills (coding, data analysis, etc.) and soft skills (communication, leadership)\n• Take on challenging projects, even if they're outside your comfort zone\n• Learn at least one high-demand skill in your field\n\n**💡 Network Strategically**\n• Connect with professionals on LinkedIn\n• Attend industry events, conferences, and meetups\n• Join professional organizations and student clubs\n• Reach out to alumni from your university\n\n**💡 Gain Real Experience**\n• Internships are crucial - start applying early\n• Freelance or volunteer work counts\n• Personal projects demonstrate initiative\n• Part-time jobs teach valuable workplace skills\n\n**💡 Build Your Personal Brand**\n• Create a portfolio website showcasing your work\n• Write blog posts about your field\n• Contribute to open-source projects\n• Be active on professional social media\n\n**💡 Prepare for Interviews**\n• Research companies thoroughly\n• Practice common interview questions\n• Prepare your own thoughtful questions\n• Follow up with thank-you notes\n\n---\n\n📚 **Books to accelerate your career:**`;
                response.books = [
                    { title: "So Good They Can't Ignore You", author: "Cal Newport", description: "Why skills trump passion in the quest for work you love." },
                    { title: "The Start-Up of You", author: "Reid Hoffman", description: "Adapt, invest in yourself, and transform your career like a startup." },
                    { title: "Designing Your Life", author: "Bill Burnett", description: "Build a joyful life using design thinking principles." },
                    { title: "Never Eat Alone", author: "Keith Ferrazzi", description: "The art of networking and building genuine professional relationships." }
                ];
                break;
                
            case 'writing':
                response.message = `## Academic Writing Guide ✍️\n\nMaster the art of academic writing with these tips:\n\n**✏️ Pre-Writing**\n• Understand the assignment requirements thoroughly\n• Research your topic and gather credible sources\n• Create an outline to organize your thoughts\n• Develop a clear thesis statement\n\n**✏️ Drafting**\n• Start with your strongest points\n• Each paragraph should have one main idea\n• Use topic sentences to guide readers\n• Support claims with evidence and citations\n\n**✏️ Structure**\n• **Introduction:** Hook → Context → Thesis\n• **Body:** Topic sentence → Evidence → Analysis → Transition\n• **Conclusion:** Restate thesis → Summarize → Final thought\n\n**✏️ Revising**\n• Let your draft rest before revising\n• Read aloud to catch awkward phrasing\n• Check for logical flow between paragraphs\n• Ensure each paragraph supports your thesis\n\n**✏️ Editing**\n• Grammar and spelling check\n• Verify all citations are correct\n• Check formatting requirements\n• Proofread one more time!\n\n---\n\n📚 **Essential books for better writing:**`;
                response.books = [
                    { title: "The Elements of Style", author: "Strunk & White", description: "The classic, timeless guide to clear and effective writing." },
                    { title: "On Writing Well", author: "William Zinsser", description: "The definitive guide to writing nonfiction with clarity." },
                    { title: "They Say / I Say", author: "Gerald Graff", description: "Templates and moves for academic writing and argumentation." },
                    { title: "Bird by Bird", author: "Anne Lamott", description: "Some instructions on writing and life - inspiring and practical." }
                ];
                break;
                
            case 'time':
                response.message = `## Time Management Mastery ⏰\n\nTake control of your time with these strategies:\n\n**⏰ Eisenhower Matrix**\nCategorize tasks into 4 quadrants:\n• Urgent + Important → Do immediately\n• Important + Not Urgent → Schedule time\n• Urgent + Not Important → Delegate\n• Not Urgent + Not Important → Eliminate\n\n**⏰ Time Blocking**\n• Schedule specific blocks for different activities\n• Include buffer time between tasks\n• Protect your most productive hours for deep work\n\n**⏰ The Two-Minute Rule**\nIf something takes less than 2 minutes, do it now. Otherwise, schedule it or delegate it.\n\n**⏰ Eat the Frog**\nDo your most challenging task first thing in the morning when your willpower is highest.\n\n**⏰ Weekly Planning**\n• Review your week every Sunday\n• Set 3-5 priority goals for the week\n• Break big projects into daily tasks\n• Review and adjust daily\n\n**⏰ Eliminate Distractions**\n• Use website blockers during focus time\n• Put phone in another room\n• Use "Do Not Disturb" mode\n• Find your optimal study environment\n\n---\n\n📚 **Books to master your time:**`;
                response.books = [
                    { title: "Getting Things Done", author: "David Allen", description: "The art of stress-free productivity - a complete system." },
                    { title: "Atomic Habits", author: "James Clear", description: "Tiny changes, remarkable results for building better habits." },
                    { title: "The One Thing", author: "Gary Keller", description: "The surprisingly simple truth behind extraordinary results." },
                    { title: "Essentialism", author: "Greg McKeown", description: "The disciplined pursuit of less - do less but better." }
                ];
                break;
                
            case 'books':
            default:
                // Find matching books from knowledge base
                const matchedBooks = this.findMatchingBooks(query);
                
                if (matchedBooks.length > 0) {
                    const topics = this.extractTopics(query);
                    response.message = `## Book Recommendations: ${topics} 📚\n\nGreat choice! Here are my top recommendations based on your interest:\n\nThese books are selected for their educational value, accessibility, and impact in the field. Each offers unique insights that will deepen your understanding.`;
                    response.books = matchedBooks;
                    response.message += `\n\n---\n\n💡 **Want to explore further?** Ask me to explain any concept, or request more specific recommendations!`;
                } else {
                    // Generic response for unmatched queries
                    response.message = `## Reading Recommendations 📚\n\nI'd be happy to help you find great books! Based on your query, here are some versatile recommendations that every curious learner will appreciate:\n\nThese are foundational books that develop critical thinking and broaden perspectives across many disciplines.`;
                    response.books = [
                        { title: "How to Read a Book", author: "Mortimer J. Adler", description: "The classic guide to intelligent reading that transforms how you engage with any text." },
                        { title: "A Short History of Nearly Everything", author: "Bill Bryson", description: "An entertaining journey through science, making complex topics wonderfully accessible." },
                        { title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", description: "A thought-provoking exploration of human history and what makes our species unique." },
                        { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", description: "Nobel laureate's insights into how we think and make decisions." }
                    ];
                    response.message += `\n\n---\n\n💡 **Tip:** Try being more specific! Ask me:\n• "What is machine learning?" - for explanations\n• "Books about psychology" - for recommendations\n• "How to study effectively?" - for study tips`;
                }
                break;
        }

        return response;
    }

    // Find matching books from knowledge base
    findMatchingBooks(query) {
        const queryLower = query.toLowerCase();
        const matchedBooks = [];
        const seenTitles = new Set();
        
        // Check each category
        for (const [category, books] of Object.entries(this.knowledgeBase.books)) {
            if (queryLower.includes(category)) {
                books.forEach(book => {
                    if (!seenTitles.has(book.title)) {
                        matchedBooks.push({ ...book, relevance: 'high' });
                        seenTitles.add(book.title);
                    }
                });
            }
        }
        
        // If no direct match, try partial matching
        if (matchedBooks.length === 0) {
            const words = queryLower.split(/\s+/).filter(w => w.length > 3);
            for (const [category, books] of Object.entries(this.knowledgeBase.books)) {
                if (words.some(word => category.includes(word))) {
                    books.forEach(book => {
                        if (!seenTitles.has(book.title)) {
                            matchedBooks.push({ ...book, relevance: 'medium' });
                            seenTitles.add(book.title);
                        }
                    });
                }
            }
        }
        
        // Return top 4-5 books
        return matchedBooks.slice(0, 5);
    }

    // Extract topics from query for display
    extractTopics(query) {
        const queryLower = query.toLowerCase();
        const topics = [];
        
        for (const category of Object.keys(this.knowledgeBase.books)) {
            if (queryLower.includes(category)) {
                topics.push(category.charAt(0).toUpperCase() + category.slice(1));
            }
        }
        
        if (topics.length === 0) {
            // Try to extract meaningful words
            const words = query.split(/\s+/).filter(w => w.length > 4 && !['about', 'books', 'recommend', 'please', 'could', 'would', 'should'].includes(w.toLowerCase()));
            return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' & ') || 'Your Interest';
        }
        
        return topics.join(' & ');
    }

    // Clear conversation history
    clearHistory() {
        this.conversationHistory = [];
    }

    // Get conversation history
    getHistory() {
        return this.conversationHistory;
    }
}

// Create global instance
window.geminiService = new GeminiService();
