
import { extractWebsiteText } from "../src/app/api/scan/lib/text-extractor";
import { Page } from "playwright";

const mockHtml = `
<!DOCTYPE html>
<html>
<head>
<title>Test Brand - Future of Work</title>
<meta name="description" content="We help you work better with AI.">
<meta property="og:site_name" content="FutureWorks">
</head>
<body>
<nav>
  <a href="/">Home</a>
  <a href="/cart" class="nav-link">Cart</a>
  <a href="/login" id="user-login">Log In</a>
</nav>

<header>
  <h1>Revolutionize Your Workflow</h1>
  <p class="subtitle">AI-powered tools for modern teams to achieve more in less time.</p>
  <button class="btn-primary">Get Started Free</button>
</header>

<div class="product-grid">
  <div class="product-card">
    <h3 class="product-title">Basic Plan</h3>
    <p class="price">$19.99</p>
    <button>Buy Now</button>
  </div>
    <div class="product-card">
    <h3 class="product-title">Pro Plan</h3>
    <p class="price">€29.99</p>
    <button>Buy Now</button>
  </div>
</div>

<section id="about">
  <h2>Our Story</h2>
  <p>
    FutureWorks was founded in 2024 with a simple mission: to make work human again. 
    We believe that technology should empower people, not replace them. 
    Our team has spent years researching the best ways to integrate AI into daily workflows without friction.
    We are dedicated to building a future where creativity thrives.
  </p>
</section>

<footer>
  <a href="/search">Search</a>
  <div class="socials">
    <a href="https://twitter.com/futureworks">Twitter</a>
  </div>
  <p>&copy; 2024 FutureWorks</p>
</footer>
</body>
</html>
`;

// Mock Page object
const mockPage = {
    content: async () => mockHtml
} as unknown as Page;

async function run() {
    console.log("--- Running Extraction Verification ---");
    try {
        const result = await extractWebsiteText(mockPage);
        console.log("v--- RESULT START ---v");
        console.log(result);
        console.log("^--- RESULT END ---^");
    } catch (error) {
        console.error("Extraction failed:", error);
    }
}

run();
