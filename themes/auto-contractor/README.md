# Auto-Contractor Theme for Mautic

A professional landing page theme for Mautic 5.x+ designed specifically for local contractors and home service businesses (HVAC, plumbing, electrical, roofing, landscaping, pest control, cleaning, etc.).

## Features

- **GrapesJS Builder** - Native drag-and-drop editing, no slots required
- **Responsive Design** - Mobile-first approach, works on all devices
- **Professional Aesthetic** - Clean, trustworthy design optimized for conversions
- **Email Templates** - MJML-based email templates for consistent branding
- **Form Templates** - Styled forms that match your landing pages
- **Smooth Animations** - Subtle scroll animations and interactions
- **Conversion Optimized** - Strategic CTAs, trust signals, and social proof

## Installation

### Via Git (Recommended)

1. Clone or copy this theme directory to your Mautic installation:
   ```bash
   cp -r auto-contractor /path/to/mautic/themes/
   ```

2. Clear the Mautic cache:
   ```bash
   php /path/to/mautic/bin/console cache:clear
   ```

3. The theme will now appear in Mautic's theme selector.

### Via Mautic Theme Manager

1. Create a zip file of the theme directory:
   ```bash
   zip -r auto-contractor.zip auto-contractor/
   ```

2. Go to **Settings > Themes** in Mautic
3. Click **Install New Theme**
4. Upload the zip file

## Theme Structure

```
auto-contractor/
├── config.json              # Theme configuration
├── README.md                # This file
├── thumbnail.png            # Default preview (575x600px)
├── thumbnail_page.png       # Landing page preview
├── thumbnail_email.png      # Email template preview
├── thumbnail_form.png       # Form preview
├── html/
│   ├── base.html.twig       # Base template with tracking
│   ├── page.html.twig       # Landing page template
│   ├── email.html.twig      # MJML email template
│   ├── form.html.twig       # Form display template
│   └── message.html.twig    # System message template
└── assets/
    ├── css/
    │   └── style.css        # Main stylesheet
    ├── js/
    │   └── main.js          # Interactive features
    └── images/              # Add your images here
```

## Customization

### Colors

Edit the CSS variables in `assets/css/style.css` or `html/base.html.twig`:

```css
:root {
    --primary-color: #1e40af;      /* Deep blue - Trust */
    --secondary-color: #f59e0b;    /* Amber/Orange - CTAs */
    --accent-color: #059669;       /* Green - Success */
}
```

### Content

With GrapesJS builder, you can edit **any** content directly:
1. Open a landing page in the editor
2. Click on any text element to edit
3. Drag and drop to rearrange sections
4. Add/remove components as needed

### Images

Replace placeholder images by:
1. Using GrapesJS to swap images in the editor
2. Or placing your images in `assets/images/` and updating paths

## Templates

### Landing Page (`page.html.twig`)

Full landing page with:
- Sticky header with phone and CTA
- Hero section with background image
- Trust badges (years, projects, satisfaction)
- Services grid
- Why Choose Us section
- Testimonials
- Service area
- Contact form section
- Footer

### Email (`email.html.twig`)

MJML-based email template with:
- Branded header
- Content area
- CTA button
- Trust signals
- Footer with contact info and unsubscribe links

### Form (`form.html.twig`)

Styled form template that displays:
- Form header
- Validation/success messages
- Form fields with styled inputs

### Message (`message.html.twig`)

System message template for:
- Unsubscribe confirmations
- Thank you pages
- Error messages

## JavaScript Features

The theme includes:

- **Sticky Header** - Header becomes more compact on scroll
- **Smooth Scrolling** - Animated scroll to anchor links
- **Click-to-Call Tracking** - Tracks phone number clicks
- **Scroll Animations** - Elements fade in as you scroll
- **Counter Animation** - Trust badge numbers count up
- **Form Engagement Tracking** - Tracks when users interact with forms

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Email Client Support

The MJML email template supports:
- Gmail
- Apple Mail
- Outlook
- Yahoo Mail
- And most major email clients

## Requirements

- Mautic 5.x or 6.x
- GrapesJS Builder enabled
- PHP 8.0 or higher

## Tips for Best Results

1. **High-Quality Images** - Use professional photos at least 1200px wide
2. **Clear CTAs** - Keep call-to-action text short and action-oriented
3. **Trust Signals** - Update trust badges with your actual numbers
4. **Test Forms** - Always test forms after customization
5. **Mobile Preview** - Check how your pages look on mobile devices

## Support

For issues or questions:
- Check the [Mautic Developer Documentation](https://devdocs.mautic.org/en/5.x/themes/getting_started.html)
- Review the [GrapesJS Builder docs](https://devdocs.mautic.org/en/5.x/themes/grapesjs.html)

## License

This theme is provided as-is for use with Mautic.

## Credits

Theme Name: Auto-Contractor
Author: Auto-Mautic
Builder: GrapesJS
Mautic Version: 5.x+
