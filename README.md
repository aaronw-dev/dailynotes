# 💕 Daily Notes
### *Stay close when you're far apart*

## What is this?

Daily Notes is a simple, beautiful web application designed for couples to leave each other digital sticky notes. Write little messages, thoughts, or love notes, attach photos and files, and your partner can read them and add comments by highlighting specific text - just like leaving notes on a real sticky note!

## Features

- **Beautiful sticky note interface** - Looks and feels like real paper  
- **Text highlighting & comments** - Select any text to add your thoughts  
- **Encrypted media attachments** - Share photos and files with complete privacy
- **Drag & drop uploads** - Easy file sharing on any device
- **Colored themes** - Choose from yellow, blue, and pink sticky notes  
- **Mobile friendly** - Works great on phones and tablets  
- **Simple & intuitive** - No complicated features, just pure connection  

## How it works

1. **Write a note** at `/write` - Choose your color, write anything, drag & drop photos
2. **Read & comment** on the main page - Select text to highlight and add comments
3. **Stay connected** - See each other's thoughts and responses with complete privacy

## Tech Stack

- **Backend**: Python Flask with AES-256-GCM encryption
- **Database**: Google Firebase Firestore
- **Storage**: Catbox.moe (encrypted file hosting)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Deployment**: Vercel

## Setup

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Set up Firebase credentials and encryption key in `.env.local`
4. Run locally: `python main.py`
5. Or run on Vercel:  
    - Push your repository to GitHub  
    - Import your project on [Vercel](https://vercel.com/import)  
    - Set up environment variables as needed
    - Deploy and share your app!

## The Sweet Details

- **Files are encrypted at rest** with AES-256-GCM security
- **Real-time inline comments** that persist with each note
- **Infinite scroll pagination** with smooth loading
- **Responsive design** that works on any device
- **Clean, distraction-free** interface focused on your words
- **Date organization** so you can look back on your messages
- **Copy text feature** for sharing favorite quotes




yes, I used AI to write this readme. fight me.
