import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");
const attachmentsDir = path.join(projectRoot, "attachments");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = req.query.path ? path.join(attachmentsDir, req.query.path as string) : attachmentsDir;
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve attachments as static files
  app.use("/attachments", express.static(attachmentsDir));

  // API to list attachments recursively
  app.get("/api/attachments", async (req, res) => {
    try {
      const files = await getFiles(attachmentsDir);
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: "Failed to list attachments" });
    }
  });

  // API to rename an attachment
  app.post("/api/rename", async (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: "Paths required" });

    try {
      const fullOldPath = path.join(attachmentsDir, oldPath);
      const fullNewPath = path.join(attachmentsDir, newPath);

      await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
      await fs.rename(fullOldPath, fullNewPath);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to rename file" });
    }
  });

  // API to upload file
  app.post("/api/upload", upload.single("file"), (req, res) => {
    res.json({ success: true, file: req.file });
  });

  // API to create directory
  app.post("/api/mkdir", async (req, res) => {
    const { path: dirPath } = req.body;
    try {
      await fs.mkdir(path.join(attachmentsDir, dirPath), { recursive: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to create directory" });
    }
  });

  // API to delete attachments
  app.post("/api/delete", async (req, res) => {
    const { paths } = req.body;
    if (!paths || !Array.isArray(paths)) return res.status(400).json({ error: "Paths array required" });

    try {
      for (const itemPath of paths) {
        const fullPath = path.join(attachmentsDir, itemPath);
        // Security check: ensure the path is within attachmentsDir
        if (!fullPath.startsWith(attachmentsDir)) {
          continue;
        }
        await fs.rm(fullPath, { recursive: true, force: true });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete items" });
    }
  });

  // Vite integration
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
    root: path.join(__dirname, "client"),
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    try {
      let template = await fs.readFile(path.join(__dirname, "client", "index.html"), "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      res.status(500).end(e.message);
    }
  });

  const port = 3003;
  app.listen(port, () => {
    console.log(`\n🚀 Attachment Viewer running at http://localhost:${port}\n`);
  });
}

async function getFiles(dir: string, relativeDir = ""): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relPath = path.join(relativeDir, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          type: "directory",
          path: relPath,
          children: await getFiles(path.join(dir, entry.name), relPath),
        };
      } else {
        const stats = await fs.stat(path.join(dir, entry.name));
        return {
          name: entry.name,
          type: "file",
          path: relPath,
          size: stats.size,
          ext: path.extname(entry.name).toLowerCase(),
        };
      }
    })
  );
  return files;
}

startServer();
