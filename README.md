# Thevey Brand Concept

A static fashion storefront demo built with HTML, CSS, and JavaScript.

## Preview
- Open `index.html` locally or serve with a static server.

## Local preview
```bash
cd theveybrandconcept
python -m http.server 8000
```

## Deployment
- This is a static site and can be deployed to Vercel or GitHub Pages.
- Ensure `product1/` and `product2/` assets are included in the repo.

## GitHub + Vercel setup
1. Initialize git:
   ```bash
   git init
   git add .
   git commit -m "Initial static storefront demo commit"
   ```
2. Push to GitHub:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. Deploy on Vercel:
   - Connect the GitHub repo
   - Vercel will detect a static site and deploy automatically
   ```bash
   vercel --prod
   ```
