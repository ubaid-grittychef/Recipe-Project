export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Simple HTML content
  category: string;
  image_url?: string;
  published_at: string;
  read_time: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "essential-kitchen-tools",
    title: "10 Essential Kitchen Tools Every Home Cook Needs",
    excerpt: "From a quality chef's knife to a reliable instant-read thermometer, these tools will transform your cooking.",
    content: `
      <p>Whether you're just starting out in the kitchen or looking to upgrade your setup, having the right tools makes all the difference. Here are the 10 essentials that every serious home cook should own.</p>

      <h2>1. A Quality Chef's Knife</h2>
      <p>Your chef's knife is the most important tool in your kitchen. Invest in an 8-inch chef's knife that feels comfortable in your hand. A good knife makes prep work faster, safer, and more enjoyable. Look for high-carbon stainless steel that holds its edge.</p>

      <h2>2. Cutting Board</h2>
      <p>Get at least two cutting boards — one for raw proteins and one for everything else. Wooden boards are gentle on your knife edges, while plastic boards are easier to sanitize. Avoid glass cutting boards as they dull your knives quickly.</p>

      <h2>3. Cast Iron Skillet</h2>
      <p>A 12-inch cast iron skillet is incredibly versatile. Use it for searing steaks, baking cornbread, making frittatas, or even baking cookies. With proper seasoning, it becomes naturally non-stick and will last generations.</p>

      <h2>4. Instant-Read Thermometer</h2>
      <p>Stop guessing if your food is done. An instant-read thermometer takes the mystery out of cooking proteins perfectly every time. It's also essential for bread baking, candy making, and ensuring food safety.</p>

      <h2>5. Heavy-Bottomed Pot</h2>
      <p>A 6-quart Dutch oven or heavy-bottomed pot is perfect for soups, stews, braises, and even bread baking. The thick walls distribute heat evenly, preventing hot spots and scorching.</p>

      <h2>6. Sheet Pans</h2>
      <p>Half-sheet pans (18x13 inches) are kitchen workhorses. Roast vegetables, bake cookies, toast nuts, or make an entire sheet pan dinner. Get at least two — you'll use them constantly.</p>

      <h2>7. Fine Mesh Strainer</h2>
      <p>More versatile than a colander, a fine mesh strainer drains pasta, sifts flour, strains sauces for silky smoothness, and rinses grains. It's one of those tools you'll reach for more than you expect.</p>

      <h2>8. Wooden Spoons & Spatulas</h2>
      <p>Wooden utensils won't scratch your cookware, don't conduct heat, and are gentle on non-stick coatings. Keep a few wooden spoons and a flat wooden spatula on hand for everyday cooking.</p>

      <h2>9. Measuring Cups & Spoons</h2>
      <p>Accuracy matters, especially in baking. Get both dry measuring cups (nested set) and a liquid measuring cup (glass or plastic with pour spout). A set of measuring spoons rounds out the basics.</p>

      <h2>10. Tongs</h2>
      <p>Spring-loaded tongs are an extension of your hand. Flip meat, toss pasta, serve salad, rearrange items on a grill — 12-inch tongs give you reach and control without getting close to the heat.</p>

      <h2>Final Thoughts</h2>
      <p>You don't need to buy everything at once. Start with the chef's knife, cutting board, and a good skillet. Build your collection over time, investing in quality pieces that will last. Remember: a well-equipped kitchen with a few great tools beats a crowded one full of gadgets you never use.</p>
    `,
    category: "Kitchen Essentials",
    published_at: "2024-08-15T00:00:00Z",
    read_time: "5 min read",
  },
  {
    slug: "seasoning-cast-iron",
    title: "How to Properly Season a Cast Iron Skillet",
    excerpt: "A well-seasoned cast iron pan is naturally non-stick and improves with every use. Here's the definitive guide.",
    content: `
      <p>Cast iron cookware has been a kitchen staple for centuries, and for good reason. When properly seasoned, it provides an excellent cooking surface that rivals any modern non-stick pan — without the chemicals.</p>

      <h2>What is Seasoning?</h2>
      <p>Seasoning isn't about spices — it's the process of baking oil onto cast iron to create a natural, non-stick coating. The oil polymerizes (bonds to the metal at a molecular level) when heated, creating a hard, smooth surface that prevents rust and makes cooking and cleanup easier.</p>

      <h2>Step-by-Step Seasoning Process</h2>
      <p><strong>Step 1: Clean the skillet.</strong> If it's new, wash with warm soapy water (this is the one time soap is OK). For a rusty skillet, scrub with steel wool until you're down to bare metal. Dry completely.</p>
      <p><strong>Step 2: Apply a thin layer of oil.</strong> Use flaxseed oil, vegetable oil, or Crisco. Apply a very thin layer all over — inside, outside, and handle. Then wipe off as much as you can with a clean cloth. It should look almost dry.</p>
      <p><strong>Step 3: Bake upside down.</strong> Place the skillet upside down in an oven at 450°F (230°C). Put foil on the rack below to catch drips. Bake for 1 hour.</p>
      <p><strong>Step 4: Cool in the oven.</strong> Turn off the oven and let the skillet cool completely inside. This slow cooling helps the seasoning bond properly.</p>
      <p><strong>Step 5: Repeat.</strong> For a new or restored skillet, repeat this process 3-4 times to build up a good base seasoning.</p>

      <h2>Maintaining Your Seasoning</h2>
      <p>After each use, clean your skillet while it's still warm. Use hot water and a brush or scraper — avoid soap for daily cleaning. Dry it on the stove over low heat, then apply a very thin layer of oil before storing.</p>

      <h2>Common Mistakes to Avoid</h2>
      <p><strong>Too much oil:</strong> The biggest mistake. Excess oil creates a sticky, uneven surface. Apply oil, then wipe it off until it looks dry. <strong>Wrong temperature:</strong> Too low and the oil won't polymerize; too high and it'll burn. 450°F is the sweet spot for most oils. <strong>Soaking in water:</strong> Never leave cast iron sitting in water. It will rust.</p>

      <h2>The Bottom Line</h2>
      <p>A well-seasoned cast iron skillet improves with every use. Cook fatty foods like bacon early on to help build the seasoning. With proper care, your cast iron will become your most prized kitchen possession.</p>
    `,
    category: "Techniques",
    published_at: "2024-09-01T00:00:00Z",
    read_time: "4 min read",
  },
  {
    slug: "cooking-temperatures-guide",
    title: "The Complete Guide to Safe Cooking Temperatures",
    excerpt: "Know exactly when your food is perfectly and safely cooked with this essential temperature reference.",
    content: `
      <p>Cooking proteins to the right internal temperature is the key to both food safety and great flavor. Here's your complete reference guide.</p>

      <h2>Poultry</h2>
      <p><strong>Chicken & Turkey (whole, pieces, ground):</strong> 165°F (74°C). This is non-negotiable for food safety. Use a thermometer inserted into the thickest part of the thigh (avoiding bone) for whole birds.</p>

      <h2>Beef & Lamb</h2>
      <p><strong>Rare:</strong> 125°F (52°C) — Cool red center. <strong>Medium-Rare:</strong> 135°F (57°C) — Warm red center, the sweet spot for steaks. <strong>Medium:</strong> 145°F (63°C) — Warm pink center. <strong>Medium-Well:</strong> 150°F (66°C) — Slightly pink. <strong>Well-Done:</strong> 160°F (71°C) — No pink.</p>
      <p><strong>Ground beef:</strong> Always cook to 160°F (71°C) since grinding distributes bacteria throughout the meat.</p>

      <h2>Pork</h2>
      <p><strong>Chops, roasts, tenderloin:</strong> 145°F (63°C) with a 3-minute rest. Modern pork is safe and juicy at this temperature — the old 160°F recommendation is outdated. <strong>Ground pork:</strong> 160°F (71°C).</p>

      <h2>Fish & Seafood</h2>
      <p><strong>Fish fillets:</strong> 145°F (63°C), or when flesh is opaque and flakes easily. <strong>Shrimp & lobster:</strong> Cook until flesh is opaque. <strong>Scallops:</strong> Cook until firm and opaque.</p>

      <h2>Pro Tips</h2>
      <p><strong>Carryover cooking:</strong> Remove meat 5°F below target temperature. It will continue cooking as it rests. <strong>Rest your meat:</strong> Let steaks rest 5 minutes, roasts rest 15-20 minutes. This redistributes juices for a more flavorful result. <strong>Calibrate your thermometer:</strong> Test in ice water (should read 32°F/0°C) periodically.</p>
    `,
    category: "Food Safety",
    published_at: "2024-09-20T00:00:00Z",
    read_time: "3 min read",
  },
  {
    slug: "knife-skills-basics",
    title: "Knife Skills 101: Cuts Every Cook Should Know",
    excerpt: "Master the fundamental cutting techniques that will speed up your prep and improve your cooking.",
    content: `
      <p>Good knife skills are the foundation of efficient cooking. Learning just a few basic cuts will make your prep faster, your food cook more evenly, and your dishes look more professional.</p>

      <h2>How to Hold a Knife</h2>
      <p>Grip the blade where it meets the handle (the "pinch grip"). Your thumb and index finger should pinch the blade just above the bolster, with your remaining fingers wrapped around the handle. This gives you maximum control and reduces fatigue.</p>

      <h2>The Basic Cuts</h2>
      <p><strong>Rough Chop:</strong> Irregular pieces, roughly the same size. Perfect for stocks, soups, and anything that will be pureed or cooked for a long time.</p>
      <p><strong>Dice:</strong> Uniform cubes. Small dice (1/4 inch), medium dice (1/2 inch), and large dice (3/4 inch). Even sizes ensure even cooking.</p>
      <p><strong>Mince:</strong> Very finely chopped, almost a paste. Used for garlic, ginger, and herbs where you want flavor distributed evenly.</p>
      <p><strong>Julienne:</strong> Thin matchstick strips, about 1/8 inch thick and 2-3 inches long. Beautiful in salads, stir-fries, and as garnishes.</p>
      <p><strong>Chiffonade:</strong> Stack leafy herbs or greens, roll them tightly, then slice into thin ribbons. Perfect for basil garnish on pasta or pizza.</p>
      <p><strong>Brunoise:</strong> Tiny 1/8-inch cubes. Made by cutting julienne strips crosswise. Used for fine garnishes and sauces.</p>

      <h2>Tips for Better Knife Skills</h2>
      <p><strong>Keep your knife sharp.</strong> A sharp knife is safer than a dull one — it requires less force and is less likely to slip. <strong>Use a claw grip</strong> on the food: curl your fingertips inward and let your knuckles guide the blade. <strong>Let the knife do the work</strong> — use a rocking motion rather than pressing down.</p>
    `,
    category: "Techniques",
    published_at: "2024-10-05T00:00:00Z",
    read_time: "4 min read",
  },
  {
    slug: "meal-prep-beginners",
    title: "Meal Prep for Beginners: A Week of Meals in 2 Hours",
    excerpt: "Save time and money with strategic batch cooking. Here's how to meal prep like a pro.",
    content: `
      <p>Meal prepping is the secret weapon of busy home cooks. By spending just 2 hours on Sunday, you can have healthy, delicious meals ready for the entire week.</p>

      <h2>The Basics of Meal Prep</h2>
      <p>Meal prep means cooking components or full meals in advance. You don't have to prep every single meal — even prepping lunches or having pre-chopped vegetables ready can save enormous time during the week.</p>

      <h2>Getting Started: The 3-Container System</h2>
      <p><strong>Container 1: Protein.</strong> Cook a large batch of chicken breasts, ground turkey, or baked tofu. Season simply so you can use it in different meals. <strong>Container 2: Grain/Starch.</strong> Make a big pot of rice, quinoa, or roasted sweet potatoes. <strong>Container 3: Vegetables.</strong> Roast a sheet pan of mixed vegetables (broccoli, bell peppers, zucchini) or prep a large salad base.</p>

      <h2>Week 1 Sample Plan</h2>
      <p><strong>Sunday Prep (2 hours):</strong> Bake 2 lbs chicken breast, cook 3 cups rice, roast 2 sheet pans of vegetables, make a jar of vinaigrette, wash and chop salad greens.</p>
      <p><strong>Monday:</strong> Chicken rice bowl with roasted vegetables. <strong>Tuesday:</strong> Chicken salad with vinaigrette. <strong>Wednesday:</strong> Chicken stir-fry (reheat chicken and vegetables with soy sauce and sesame oil). <strong>Thursday:</strong> Rice and vegetable burrito bowls. <strong>Friday:</strong> Use remaining ingredients or cook something fresh as a treat.</p>

      <h2>Essential Meal Prep Tips</h2>
      <p><strong>Invest in good containers.</strong> Glass containers with locking lids are best — they're microwave-safe, don't stain, and last forever. <strong>Label everything</strong> with the date. <strong>Most prepped meals last 4-5 days</strong> in the fridge. <strong>Don't prep everything identically</strong> — vary your sauces and seasonings so meals feel different throughout the week.</p>

      <h2>Common Mistakes</h2>
      <p>Overcomplicating your first week. Start with simple proteins and grains, then get more creative as you build the habit. Also, don't skip the sauces and seasonings — they're what keep meal prep from becoming boring.</p>
    `,
    category: "Tips & Tricks",
    published_at: "2024-11-01T00:00:00Z",
    read_time: "5 min read",
  },
];

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}

export function getPostCategories(): string[] {
  return Array.from(new Set(BLOG_POSTS.map(p => p.category))).sort();
}
