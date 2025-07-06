# Productivity Quest - Gamified Task Management

A gamified productivity web application where users can manage tasks, earn points, and track their progress with a modern, engaging interface.

## Features

- **User Authentication**: Secure login/registration system
- **Task Management**: Create, complete, and track one-time tasks
- **Recurring Tasks**: Set up weekly recurring tasks with customizable goals
- **Points System**: Earn points for completing tasks with different reward types
- **Progress Tracking**: Visual stats dashboard with real-time updates
- **Weekly Goals**: Set and track weekly points goals
- **Modern UI**: Beautiful, responsive interface with animations

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Authentication**: JWT, bcrypt
- **Styling**: Custom CSS with modern design principles

## Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and visit `http://localhost:3001`

## Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Deploy to Vercel**:
```bash
vercel
```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Set project name
   - Confirm deployment settings

4. **Your app will be live** at `https://your-app-name.vercel.app`

### Option 2: Railway

1. **Create Railway account** at [railway.app](https://railway.app)
2. **Connect your GitHub repository**
3. **Deploy automatically** - Railway will detect your Node.js app
4. **Your app will be live** at the provided URL

### Option 3: DigitalOcean App Platform

1. **Create DigitalOcean account**
2. **Create new app** in App Platform
3. **Connect your GitHub repository**
4. **Configure build settings**:
   - Build Command: `npm install`
   - Run Command: `npm start`
5. **Deploy** and get your live URL

## Custom Domain Setup

### After deploying to Vercel:

1. **Purchase a domain** from Namecheap, GoDaddy, or similar
2. **In Vercel dashboard**:
   - Go to your project settings
   - Click "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

### DNS Configuration Example:
```
Type: CNAME
Name: @
Value: your-app-name.vercel.app
```

## Environment Variables

For production, consider setting these environment variables:
- `JWT_SECRET`: Custom JWT secret (optional, app generates one)
- `PORT`: Custom port (optional, defaults to 3001)

## Database

The app uses SQLite for simplicity. In production, consider:
- **Vercel**: SQLite works but data resets on redeploy
- **Railway**: Add PostgreSQL addon for persistent data
- **DigitalOcean**: Use managed database service

## Project Structure

```
server/
├── Index.js              # Main server file
├── package.json          # Dependencies and scripts
├── vercel.json          # Vercel deployment config
├── public/              # Static files
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Styles
│   └── script.js        # Frontend JavaScript
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues:
1. Check the console for error messages
2. Ensure all dependencies are installed
3. Verify Node.js version is 18+
4. Check that port 3001 is available

---

**Happy Productivity Questing! 🚀** 