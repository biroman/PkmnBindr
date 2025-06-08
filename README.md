# PokemonAPI - Authentication System

A modern React application with Firebase authentication, built with Vite, Tailwind CSS, and Radix UI components.

## 🚀 Features

- **User Authentication**

  - User registration with email and password
  - User login with secure authentication
  - Password reset functionality via email
  - Protected routes requiring authentication
  - Automatic redirect to login for unauthenticated users

- **User Management**

  - Owner role system (configurable via environment variables)
  - User profile data stored in Firestore
  - Real-time authentication state management

- **Modern UI/UX**

  - Built with Tailwind CSS for styling
  - Radix UI components for accessibility
  - Responsive design
  - Loading states and error handling
  - Form validation with real-time feedback

- **Technical Stack**
  - React 19 with Vite
  - Firebase Authentication & Firestore
  - React Router for navigation
  - TanStack Query for state management
  - TypeScript-ready structure

## 🛠️ Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Make sure your `.env` file contains the Firebase configuration:

   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_OWNER_EMAIL=your_admin_email@domain.com
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx          # Login form component
│   │   ├── RegisterForm.jsx       # Registration form component
│   │   ├── ForgotPasswordForm.jsx # Password reset form
│   │   └── ProtectedRoute.jsx     # Route protection wrapper
│   ├── layout/
│   │   └── Navbar.jsx             # Navigation bar with auth controls
│   └── ui/
│       ├── Button.jsx             # Reusable button component
│       ├── Input.jsx              # Form input component
│       ├── Label.jsx              # Form label component
│       └── Alert.jsx              # Alert/notification component
├── contexts/
│   └── AuthContext.jsx            # Authentication context provider
├── lib/
│   ├── firebase.js                # Firebase configuration
│   └── utils.js                   # Utility functions
├── pages/
│   ├── HomePage.jsx               # Protected home page
│   └── AuthLayout.jsx             # Authentication pages layout
└── App.jsx                        # Main application component
```

## 🔐 Authentication Flow

1. **Registration:**

   - User provides email, password, and display name
   - Firebase creates the authentication account
   - User profile is stored in Firestore
   - Automatic sign-in after successful registration

2. **Login:**

   - User provides email and password
   - Firebase validates credentials
   - Authentication state is updated globally
   - Redirect to intended page or home

3. **Password Reset:**

   - User provides email address
   - Firebase sends reset email
   - User can reset password via email link

4. **Protected Routes:**
   - Routes check authentication state
   - Redirect to login if not authenticated
   - Remember intended destination for post-login redirect

## 👑 Owner Role

The application includes an owner role system:

- Set `VITE_OWNER_EMAIL` in your environment variables
- Users with this email get special "Owner" status
- Use `useOwner()` hook to check owner privileges
- Owner status is displayed in the navigation bar

## 🎨 Customization

The application uses a modern design system:

- **Colors:** Customizable via CSS variables in `src/index.css`
- **Components:** Built with Radix UI primitives for accessibility
- **Styling:** Tailwind CSS with custom design tokens
- **Icons:** Ready for icon library integration

## 🔧 Key Hooks & Utilities

- `useAuth()` - Access authentication state and methods
- `useOwner()` - Check if current user is the owner
- `formatErrorMessage()` - Format Firebase errors for display
- `validateEmail()` - Email validation utility
- `validatePassword()` - Password validation utility

## 🚦 Getting Started

1. Run the development server
2. Navigate to `http://localhost:5173`
3. Try creating a new account via "Sign Up"
4. Test the login functionality
5. Use the owner email to see admin privileges
6. Test password reset functionality

## 📝 Next Steps

This authentication system provides a solid foundation for your application. You can now:

- Add additional user profile fields
- Implement role-based permissions
- Add social authentication providers
- Extend the user interface
- Add your Pokemon API functionality

## 🤝 Contributing

This is a foundational authentication system ready for your Pokemon API project. Feel free to extend and customize based on your specific requirements.
