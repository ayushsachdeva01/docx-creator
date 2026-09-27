# Images → PDF + A4 DOCX

A small, static GitHub Pages website that converts locally selected images into:

1. **Normal PDF** — one image per A4 portrait page, centered and fitted without cropping.
2. **Fixed A4 DOCX** — one image per A4 portrait Word page, with zero page margins and the image fitted without cropping.

## Privacy

The selected image files are processed in the browser. They are not uploaded to a server by this project.

The page loads `jsPDF` and `docx` from public CDNs, so an internet connection is needed when the page first loads. The image files themselves stay in the browser.

## GitHub Pages setup

1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, and `app.js` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save. GitHub will provide the Pages URL.

There is no build step and no Node.js server.

## Usage

- Select multiple images or drag them onto the page.
- Use ↑ / ↓ to change page order.
- Remove any image you do not want.
- Click **Download PDF** or **Download A4 DOCX**.

## Libraries

- jsPDF 4.2.1 for client-side PDF generation.
- docx 9.1.0 for browser-side Word document generation.

The website uses the browser UMD builds; see the official documentation for [docx](https://docx.js.org/api/) and [jsPDF](https://github.com/parallax/jsPDF).
