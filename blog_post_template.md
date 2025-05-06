# Blog Post Creation Prompt Template

**Goal:** Create a new blog post for the MovieRec website.

**Topic:** [Specify the main topic of the blog post here]

**Key Points/Sections:**
*   [List the main points, sections, or information to include]
*   [Add more points as needed]

**Desired Tone/Style:**
*   SEO-friendly (use relevant keywords)
*   Readable and engaging
*   Consistent with the existing website style
*   Include relevant numbers/data if applicable

**Images:**
*   [Suggest specific images or types of images needed]
*   [Specify desired captions if any]
*   *(AI Note: Remember to use reliable sources like Wikimedia Commons, TMDb, IMDb, or royalty-free stock photo sites. Verify URLs and check for hotlinking issues.)*

**Target Audience:** [Optional: Specify the target audience if relevant]

**Call to Action:** [Optional: Suggest a question or action for the end of the post]

---

**Standard Procedure (For AI Assistant):**

1.  **Create Markdown File:**
    *   Location: `public/blog/`
    *   Filename: `[topic-slug].md` (e.g., `upcoming-sci-fi-movies.md`)
    *   Format: Markdown (`.md`)
    *   Structure:
        *   `# Title of the Post`
        *   `**Date:** [Current Date]`
        *   `![Alt text](image-url "Optional title")` (Include at least one header image)
        *   `## Section Header`
        *   Content (paragraphs, lists, etc.)
        *   Include other images as requested using `![Alt text](image-url "Optional title")`.
        *   End with `---` and an optional call to action/question.
2.  **Update Blog Index:**
    *   File: `src/pages/BlogIndexPage.jsx`
    *   Modify the `posts` array: Add a new entry for the post, including:
        *   `slug`: Matches the markdown filename without `.md`.
        *   `title`: The main title from the markdown.
        *   `date`: The date used in the markdown.
        *   `excerpt`: A short summary (1-2 sentences).
        *   `readTime`: Estimated read time (e.g., '4 min read').
        *   `category`: A relevant category (e.g., 'Analysis', 'News', 'Tips').
3.  **Verify:**
    *   Check that the post renders correctly at `/blog/[slug]`.
    *   Ensure all images load correctly.
    *   Confirm the post appears on the main blog index page (`/blog`).
    *   Confirm an ad unit appears automatically after the first `##` section heading in the post.