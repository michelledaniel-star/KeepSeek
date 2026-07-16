# LegacyVault - Museum Viewer Prototype

A beautiful web application for preserving family stories through objects.

## What You Have

This is a **working prototype** of the Museum Viewer side of LegacyVault. It includes:

- ✅ Beautiful grid view of items
- ✅ Detailed item pages with provenance
- ✅ Museum Directory (family tree view)
- ✅ Responsive design
- ✅ Navigation between views
- ✅ Mock data that demonstrates the concept

## Tech Stack

- **React** - Frontend framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Vite** - Build tool (super fast!)

## How to Run It

### Prerequisites
You need Node.js installed. Check if you have it:
```bash
node --version
```

If you don't have it, download from: https://nodejs.org (get the LTS version)

### Setup & Run

1. **Navigate to the project folder:**
```bash
cd legacyvault
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser to:** http://localhost:3000

That's it! The app will automatically reload when you make changes.

## What Works Now

- Click on any item in the grid to see its detail page
- View provenance (who owned it)
- Read the story behind each item
- Navigate to the Museum Directory to see the family tree
- Click on family members to see their items

## Next Steps

1. **Curator Portal** - Add interface for uploading items
2. **Real Database** - Replace mock data with PostgreSQL
3. **Authentication** - Add user login/signup
4. **File Upload** - Implement image/video upload to cloud storage
5. **Voice Recording** - Add voice memo feature
6. **Family Tree Logic** - Build relationship management

## File Structure

```
legacyvault/
├── src/
│   ├── components/     # React components
│   ├── data/          # Mock data
│   ├── App.jsx        # Main app component
│   └── index.jsx      # Entry point
├── package.json       # Dependencies
└── vite.config.js     # Build configuration
```

## Notes

- All images are placeholder URLs from Unsplash
- Data is hardcoded in `src/data/mockData.js`
- No backend yet - this is frontend-only
- Ready to connect to a real API when you build the backend

---

**Built with ❤️ for preserving family legacies**
