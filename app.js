(() => {
  "use strict";

  const state = { files: [], urls: [] };

  const $ = (id) => document.getElementById(id);
  const input = $("fileInput");
  const list = $("imageList");
  const emptyState = $("emptyState");
  const count = $("count");
  const clearBtn = $("clearBtn");
  const pdfBtn = $("pdfBtn");
  const docxBtn = $("docxBtn");
  const status = $("status");
  const dropzone = $("dropzone");

  const A4_W_MM = 210;
  const A4_H_MM = 297;
  const A4_W_PX = 794;
  const A4_H_PX = 1123;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  function mimeFor(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (file.type === "image/png" || ext === "png") return "png";
    if (file.type === "image/gif" || ext === "gif") return "gif";
    if (file.type === "image/bmp" || ext === "bmp") return "bmp";
    return "jpg";
  }

  function isSupported(file) {
    return file.type.startsWith("image/") || /\.(jpe?g|png|gif|bmp)$/i.test(file.name);
  }

  async function readDimensions(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return { width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read one of the images."));
      img.src = src;
    });
  }

  async function addFiles(fileList) {
    const incoming = [...fileList].filter(isSupported);
    if (!incoming.length) {
      setStatus("Please choose image files such as JPG or PNG.", true);
      return;
    }

    setStatus("Reading images…");
    for (const file of incoming) {
      state.files.push(file);
      state.urls.push(URL.createObjectURL(file));
    }
    await renderList();
    setStatus(`${state.files.length} image${state.files.length === 1 ? "" : "s"} ready.`);

}

  function removeAt(index) {
    URL.revokeObjectURL(state.urls[index]);
    state.files.splice(index, 1);
    state.urls.splice(index, 1);
    renderList();

    setStatus(state.files.length ? `${state.files.length} images ready.` : "No images selected.");
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= state.files.length) return;
    [state.files[index], state.files[target]] = [state.files[target], state.files[index]];
    [state.urls[index], state.urls[target]] = [state.urls[target], state.urls[index]];
    renderList();

  }

  async function renderList() {
    list.innerHTML = "";
    emptyState.hidden = state.files.length > 0;
    clearBtn.disabled = state.files.length === 0;
    pdfBtn.disabled = state.files.length === 0;
    docxBtn.disabled = state.files.length === 0;
    count.textContent = state.files.length
      ? `${state.files.length} image${state.files.length === 1 ? "" : "s"}`
      : "No images selected";

    for (let i = 0; i < state.files.length; i++) {
      const file = state.files[i];
      const li = document.createElement("li");
      li.className = "image-item";

      const img = document.createElement("img");
      img.className = "thumb";
      img.src = state.urls[i];
      img.alt = "";
      li.appendChild(img);

      const info = document.createElement("div");
      const name = document.createElement("div");
      name.className = "filename";
      name.title = file.name;
      name.textContent = `${i + 1}. ${file.name}`;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${formatBytes(file.size)} • ${mimeFor(file).toUpperCase()}`;
      info.append(name, meta);
      li.appendChild(info);

      const controls = document.createElement("div");
      controls.className = "controls";

      const up = document.createElement("button");
      up.className = "small-btn";
      up.textContent = "↑";
      up.title = "Move up";
      up.disabled = i === 0;
      up.onclick = () => move(i, -1);

      const down = document.createElement("button");
      down.className = "small-btn";
      down.textContent = "↓";
      down.title = "Move down";
      down.disabled = i === state.files.length - 1;
      down.onclick = () => move(i, 1);

      const remove = document.createElement("button");
      remove.className = "small-btn remove";
      remove.textContent = "×";
      remove.title = "Remove";
      remove.onclick = () => removeAt(i);

      controls.append(up, down, remove);
      li.appendChild(controls);
      list.appendChild(li);
    }
  }

  function fitInside(srcW, srcH, maxW, maxH) {
    const scale = Math.min(maxW / srcW, maxH / srcH);
    return { width: srcW * scale, height: srcH * scale };
  }

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Could not read file."));
      reader.readAsDataURL(file);
    });
  }

  async function createPdf() {
    if (!state.files.length) return;
    const { jsPDF } = window.jspdf;
    setStatus("Creating PDF…");
    pdfBtn.disabled = true;
    docxBtn.disabled = true;

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      for (let i = 0; i < state.files.length; i++) {
        if (i > 0) pdf.addPage("a4", "portrait");
        const file = state.files[i];
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        const fitted = fitInside(img.naturalWidth, img.naturalHeight, A4_W_MM, A4_H_MM);
        const x = (A4_W_MM - fitted.width) / 2;
        const y = (A4_H_MM - fitted.height) / 2;
        const format = mimeFor(file) === "png" ? "PNG" : "JPEG";
        pdf.addImage(dataUrl, format, x, y, fitted.width, fitted.height, undefined, "FAST");
      }

      pdf.save(outputFilename("pdf"));
      setStatus("PDF downloaded.");
    } catch (err) {
      console.error(err);
      setStatus("Could not create the PDF: " + (err.message || err), true);
    } finally {
      pdfBtn.disabled = false;
      docxBtn.disabled = false;
    }
  }

  async function createDocx() {
    if (!state.files.length) return;
    if (!window.docx) {
      setStatus("The DOCX library did not load. Check your internet connection and reload the page.", true);
      return;
    }

    setStatus("Creating A4 Word document…");
    pdfBtn.disabled = true;
    docxBtn.disabled = true;

    try {
      const {
        Document, Packer, Paragraph, ImageRun,
        AlignmentType, SectionType
      } = window.docx;

      const sections = [];

      for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];
        const data = new Uint8Array(await file.arrayBuffer());
        const img = await loadImage(state.urls[i]);
        const fitted = fitInside(img.naturalWidth, img.naturalHeight, A4_W_PX, A4_H_PX);

        const type = mimeFor(file);
        const safeType = type === "jpg" ? "jpg" : (["png", "gif", "bmp"].includes(type) ? type : "jpg");

        sections.push({
          properties: {
            type: i === 0 ? SectionType.CONTINUOUS : SectionType.NEW_PAGE,
            page: {
              size: {
                width: 11906,
                height: 16838
              },
              margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                header: 0,
                footer: 0,
                gutter: 0
              }
            }
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0, line: 0 },
              children: [
                new ImageRun({
                  data,
                  type: safeType,
                  transformation: {
                    width: Math.round(fitted.width),
                    height: Math.round(fitted.height)
                  }
                })
              ]
            })
          ]
        });
      }

      const doc = new Document({
        sections,
        compatibility: {
          doNotExpandShiftReturn: true
        }
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, outputFilename("docx"));
      setStatus("A4 DOCX downloaded.");
    } catch (err) {
      console.error(err);
      setStatus("Could not create the DOCX: " + (err.message || err), true);
    } finally {
      pdfBtn.disabled = false;
      docxBtn.disabled = false;
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  input.addEventListener("change", async (e) => {
    await addFiles(e.target.files);
    input.value = "";
  });

  clearBtn.addEventListener("click", () => {
    state.urls.forEach(URL.revokeObjectURL);
    state.files = [];
    state.urls = [];
    renderList();

    setStatus("Cleared.");
  });

  pdfBtn.addEventListener("click", createPdf);
  docxBtn.addEventListener("click", createDocx);

  ["dragenter", "dragover"].forEach(type => {
    dropzone.addEventListener(type, e => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(type => {
    dropzone.addEventListener(type, e => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", async e => {
    await addFiles(e.dataTransfer.files);
  });

  renderList();
})();


// Custom filename + native mobile sharing
function sanitizeOutputFilename(value) {
  let name = String(value || "").trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\.+$/g, "");
  return name || "images";
}
function outputFilename(ext) {
  const el = document.getElementById("filenameInput");
  return sanitizeOutputFilename(el ? el.value : "images") + "." + ext;
}
async function shareOrDownloadFile(blob, filename, title) {
  const file = new File([blob], filename, {type: blob.type || "application/octet-stream"});
  if (navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) {
    try { await navigator.share({title:title || filename, files:[file]}); return "shared"; }
    catch(e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000); return "downloaded";
}
async function makePdfBlob() {
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  for(let i=0;i<state.files.length;i++) {
    if(i) pdf.addPage("a4","portrait");
    const data=await fileToDataUrl(state.files[i]), img=await loadImage(data);
    const f=fitInside(img.naturalWidth,img.naturalHeight,210,297);
    pdf.addImage(data,mimeFor(state.files[i])==="png"?"PNG":"JPEG",(210-f.width)/2,(297-f.height)/2,f.width,f.height,undefined,"FAST");
  }
  return pdf.output("blob");
}
async function makeDocxBlob() {
  const {Document,Packer,Paragraph,ImageRun,AlignmentType,SectionType}=window.docx;
  const sections=[];
  for(let i=0;i<state.files.length;i++) {
    const file=state.files[i], data=new Uint8Array(await file.arrayBuffer()), img=await loadImage(state.urls[i]);
    const f=fitInside(img.naturalWidth,img.naturalHeight,794,1123), t=mimeFor(file);
    sections.push({properties:{type:i===0?SectionType.CONTINUOUS:SectionType.NEW_PAGE,page:{size:{width:11906,height:16838},margin:{top:0,right:0,bottom:0,left:0,header:0,footer:0,gutter:0}}},children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:0},children:[new ImageRun({data,type:t==="jpg"?"jpg":(["png","gif","bmp"].includes(t)?t:"jpg"),transformation:{width:Math.round(f.width),height:Math.round(f.height)}})]})]});
  }
  return Packer.toBlob(new Document({sections}));
}
async function doSharePdf(){try{setStatus("Preparing PDF for sharing…");const r=await shareOrDownloadFile(await makePdfBlob(),outputFilename("pdf"),"PDF");setStatus(r==="shared"?"PDF shared.":r==="cancelled"?"Share cancelled.":"PDF downloaded.")}catch(e){console.error(e);setStatus("Could not share PDF: "+(e.message||e),true)}}
async function doShareDocx(){try{setStatus("Preparing DOCX for sharing…");const r=await shareOrDownloadFile(await makeDocxBlob(),outputFilename("docx"),"A4 DOCX");setStatus(r==="shared"?"DOCX shared.":r==="cancelled"?"Share cancelled.":"DOCX downloaded.")}catch(e){console.error(e);setStatus("Could not share DOCX: "+(e.message||e),true)}}
document.getElementById("sharePdfBtn")?.addEventListener("click",doSharePdf);
document.getElementById("shareDocxBtn")?.addEventListener("click",doShareDocx);
document.getElementById("filenameInput")?.addEventListener("input",()=>{});


// Native Android/iOS file sharing + custom filenames.
function sanitizeOutputFilename(value) {
  let name = String(value || "").trim()
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\.+$/g, "")
  return name || "images"
}
function outputFilename(ext) {
  const el = document.getElementById("filenameInput")
  return sanitizeOutputFilename(el ? el.value : "images") + "." + ext
}
async function shareFileNative(blob, filename, title) {
  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream"
  });

  if (typeof navigator.share === "function") {
    let shareable = true;
    if (typeof navigator.canShare === "function") {
      try {
        shareable = navigator.canShare({ files: [file] });
      } catch (_) {
        shareable = false;
      }
    }

    if (shareable) {
      try {
        await navigator.share({ title: title || filename, files: [file] });
        return "shared";
      } catch (e) {
        if (e && e.name === "AbortError") return "cancelled";
        console.warn("Native share failed; using download fallback.", e);
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}

setTimeout(syncShareButtons, 0)



document.getElementById("sharePdfBtn")?.addEventListener("click", async () => {
  if (!Array.isArray(state.files) || state.files.length === 0) {
    setStatus("Upload at least one image first.", true);
    return;
  }
  try {
    setStatus("Preparing PDF for sharing…");
    const blob = await generateSharePdfBlob();
    const result = await shareFileNative(blob, outputFilename("pdf"), "PDF");
    setStatus(result === "shared" ? "PDF shared." :
      result === "cancelled" ? "Share cancelled." : "PDF downloaded.");
  } catch (e) {
    console.error(e);
    setStatus("Could not share PDF: " + (e.message || e), true);
  }
});

document.getElementById("shareDocxBtn")?.addEventListener("click", async () => {
  if (!Array.isArray(state.files) || state.files.length === 0) {
    setStatus("Upload at least one image first.", true);
    return;
  }
  try {
    setStatus("Preparing DOCX for sharing…");
    const blob = await generateShareDocxBlob();
    const result = await shareFileNative(blob, outputFilename("docx"), "A4 DOCX");
    setStatus(result === "shared" ? "DOCX shared." :
      result === "cancelled" ? "Share cancelled." : "DOCX downloaded.");
  } catch (e) {
    console.error(e);
    setStatus("Could not share DOCX: " + (e.message || e), true);
  }
});
