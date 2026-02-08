# Kelsey's Homestay - Home Page Setup

This project is a complete copy of the home page from kelsey-frontend, built with Next.js and Tailwind CSS.

## Features Implemented

✅ **Navbar Component**
- Fixed navigation with logo
- Mobile responsive hamburger menu
- Login/Sign Up buttons
- Links to Home, Listings, and Calendar pages

✅ **Hero Section**
- Full-screen hero with background image
- Search bar with location and price range filters
- Dropdown menus for search options
- Smooth animations on page load

✅ **Featured Listings Section**
- Grid display of featured properties
- Property cards with images, details, and amenities
- Skeleton loading states
- "View All Listings" button

✅ **Footer Component**
- Email subscription form
- Social media links
- Copyright information

✅ **Mock Data**
- No Supabase dependency
- Sample listings with realistic data
- Mock locations for search

## Required Assets

### Images Needed in `/public` folder:
1. **heroimage.png** - Main hero section background image
   - Recommended size: 1920x1080px or larger
   - Should be a nice vacation/homestay related image

## Getting Started

1. **Add the hero image:**
   ```
   Place your hero image at: /public/heroimage.png
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Customization

### Colors
The main brand color is `#0B5858` (teal). You can customize this in the Tailwind classes throughout the components.

### Fonts
Using **Poppins** font from Google Fonts. It's imported in `globals.css`.

### Mock Data
Edit `/lib/mockData.ts` to change the sample listings and locations.

## Components Structure

```
components/
├── Navbar.tsx           - Top navigation bar
├── Footer.tsx           - Bottom footer
├── Hero.tsx            - Hero section with search
├── ResultsSection.tsx  - Featured listings container
├── Listings.tsx        - Listings grid with loading states
└── PropertyCard.tsx    - Individual property card

types/
└── listing.ts          - TypeScript interfaces

lib/
└── mockData.ts         - Mock data for listings
```

## Animations

Custom CSS animations are defined in `globals.css`:
- `fade-in-up` - Elements fade in while moving up
- `fade-in-left` - Elements fade in from left
- `fade-in-right` - Elements fade in from right
- `slide-up` - Smooth slide up animation

## Pages to Create Next

The app links to these pages (create them as needed):
- `/listings` - All listings page
- `/calendar` - Calendar view
- `/login` - Login page
- `/signup` - Sign up page
- `/unit/[id]` - Individual property details

## Responsive Design

The page is fully responsive with breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Notes

- All Supabase dependencies have been removed
- Using Next.js App Router
- Tailwind CSS v4 for styling
- TypeScript for type safety
- Mock data instead of real API calls

Enjoy your new home page! 🏡
