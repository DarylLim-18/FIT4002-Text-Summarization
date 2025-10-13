﻿const path = require("path");
const fs = require("fs");
const request = require("supertest");

const UPLOAD_DIR = path.join(__dirname, "../uploads");

describe("Files API", () => {
  let app;
  let executeMock;
  let axiosMock;
  let pdfParseMock;
  let mammothMock;

  const loadApp = () => {
    jest.resetModules();

    executeMock = jest.fn().mockResolvedValue([[]]);

    jest.doMock("mysql2/promise", () => ({
      createPool: jest.fn(() => ({
        execute: executeMock,
      })),
    }));

    pdfParseMock = jest.fn().mockResolvedValue({ text: "Parsed PDF content" });
    jest.doMock("pdf-parse", () => pdfParseMock);

    mammothMock = {
      extractRawText: jest.fn().mockResolvedValue({ value: "Extracted Word content" }),
      convertToHtml: jest.fn().mockResolvedValue({ value: "" }),
    };
    jest.doMock("mammoth", () => mammothMock);

    const axiosModule = {
      post: jest.fn().mockResolvedValue({ data: { summary: "Mock summary" } }),
      delete: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({ status: 200 }),
    };
    jest.doMock("axios", () => axiosModule);

    process.env.NODE_ENV = "test";
    process.env.ML_SERVICE_URL = "http://ml-service.test";
    process.env.PUBLIC_BACKEND_URL = "http://localhost:4000";

    app = require("../../backend/API");
    axiosMock = require("axios");
  };

  const removeFileIfExists = async (filename) => {
    if (!filename) return;
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  };

  beforeEach(() => {
    loadApp();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const mockUploadDbFlow = ({ insertId, fileName, fileType, fileSize, fileContent, uploadDate }) => {
    let savedFilename;

    executeMock.mockImplementation(async (sql, params) => {
      if (sql.includes("INSERT INTO files")) {
        savedFilename = params[1];
        return [{ insertId }];
      }

      if (sql.includes("SELECT * FROM files WHERE id = ?")) {
        return [[{
          id: insertId,
          file_name: fileName,
          file_path: savedFilename,
          file_size: fileSize,
          file_type: fileType,
          file_summary: "Mock summary",
          file_content: fileContent,
          upload_date: uploadDate,
        }]];
      }

      return [[]];
    });

    return () => savedFilename;
  };

  describe("POST /files/upload", () => {
    test("successfully uploads a PDF file", async () => {
      const captureSavedFilename = mockUploadDbFlow({
        insertId: 301,
        fileName: "presentation.pdf",
        fileType: "application/pdf",
        fileSize: 14,
        fileContent: "Parsed PDF content",
        uploadDate: "2024-01-01T00:00:00.000Z",
      });

      const response = await request(app)
        .post("/files/upload")
        .attach("file", Buffer.from("%PDF-1.4 sample"), "presentation.pdf");

      await new Promise((resolve) => setImmediate(resolve));

      const savedFilename = captureSavedFilename();

      expect(response.statusCode).toBe(200);
      expect(savedFilename).toEqual(expect.any(String));
      expect(savedFilename).toMatch(/\.pdf$/);

      expect(response.body).toEqual({
        id: 301,
        file_name: "presentation.pdf",
        file_path: savedFilename,
        file_size: 14,
        file_type: "application/pdf",
        file_summary: "Mock summary",
        file_content: "Parsed PDF content",
        upload_date: "2024-01-01T00:00:00.000Z",
      });

      expect(pdfParseMock).toHaveBeenCalledWith(expect.any(Buffer));
      expect(mammothMock.extractRawText).not.toHaveBeenCalled();
      expect(axiosMock.post).toHaveBeenCalledWith(
        "http://ml-service.test/summarize",
        expect.objectContaining({ text: expect.any(String) }),
        expect.objectContaining({ timeout: 30000 }),
      );
      expect(axiosMock.post).toHaveBeenCalledWith(
        "http://ml-service.test/documents",
        expect.objectContaining({ document_id: "file_301" }),
        expect.any(Object),
      );

      const uploadPath = path.join(UPLOAD_DIR, savedFilename);
      expect(fs.existsSync(uploadPath)).toBe(true);

      await removeFileIfExists(savedFilename);
    });

    test("successfully uploads a text file", async () => {
      const captureSavedFilename = mockUploadDbFlow({
        insertId: 302,
        fileName: "notes.txt",
        fileType: "text/plain",
        fileSize: 15,
        fileContent: "Plain text body",
        uploadDate: "2024-01-02T00:00:00.000Z",
      });

      const response = await request(app)
        .post("/files/upload")
        .attach("file", Buffer.from("Plain text body"), "notes.txt");

      await new Promise((resolve) => setImmediate(resolve));

      const savedFilename = captureSavedFilename();

      expect(response.statusCode).toBe(200);
      expect(savedFilename).toEqual(expect.any(String));
      expect(savedFilename).toMatch(/\.txt$/);

      expect(response.body).toEqual({
        id: 302,
        file_name: "notes.txt",
        file_path: savedFilename,
        file_size: 15,
        file_type: "text/plain",
        file_summary: "Mock summary",
        file_content: "Plain text body",
        upload_date: "2024-01-02T00:00:00.000Z",
      });

      expect(pdfParseMock).not.toHaveBeenCalled();
      expect(mammothMock.extractRawText).not.toHaveBeenCalled();
      expect(axiosMock.post).toHaveBeenCalledWith(
        "http://ml-service.test/summarize",
        expect.objectContaining({ text: expect.stringContaining("Plain text body") }),
        expect.objectContaining({ timeout: 30000 }),
      );
      expect(axiosMock.post).toHaveBeenCalledWith(
        "http://ml-service.test/documents",
        expect.objectContaining({ document_id: "file_302" }),
        expect.any(Object),
      );

      const uploadPath = path.join(UPLOAD_DIR, savedFilename);
      expect(fs.existsSync(uploadPath)).toBe(true);

      await removeFileIfExists(savedFilename);
    });

    test("successfully uploads a Word document", async () => {
      const captureSavedFilename = mockUploadDbFlow({
        insertId: 303,
        fileName: "report.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 21,
        fileContent: "Extracted Word content",
        uploadDate: "2024-01-03T00:00:00.000Z",
      });

      const response = await request(app)
        .post("/files/upload")
        .attach("file", Buffer.from("Fake docx binary"), "report.docx");

      await new Promise((resolve) => setImmediate(resolve));

      const savedFilename = captureSavedFilename();

      expect(response.statusCode).toBe(200);
      expect(savedFilename).toEqual(expect.any(String));
      expect(savedFilename).toMatch(/\.docx$/);

      expect(response.body).toEqual({
        id: 303,
        file_name: "report.docx",
        file_path: savedFilename,
        file_size: 21,
        file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        file_summary: "Mock summary",
        file_content: "Extracted Word content",
        upload_date: "2024-01-03T00:00:00.000Z",
      });

      expect(mammothMock.extractRawText).toHaveBeenCalledWith({
        path: path.join(UPLOAD_DIR, savedFilename),
      });
      expect(pdfParseMock).not.toHaveBeenCalled();
      expect(axiosMock.post).toHaveBeenCalledWith(
        "http://ml-service.test/summarize",
        expect.objectContaining({ text: expect.any(String) }),
        expect.objectContaining({ timeout: 30000 }),
      );
      expect(axiosMock.post).toHaveBeenCalledWith(
        "http://ml-service.test/documents",
        expect.objectContaining({ document_id: "file_303" }),
        expect.any(Object),
      );

      const uploadPath = path.join(UPLOAD_DIR, savedFilename);
      expect(fs.existsSync(uploadPath)).toBe(true);

      await removeFileIfExists(savedFilename);
    });

    test("rejects unsupported file types", async () => {
      const beforeFiles = new Set(fs.readdirSync(UPLOAD_DIR));

      const response = await request(app)
        .post("/files/upload")
        .attach("file", Buffer.from("binarydata"), "image.png");

      const afterFiles = new Set(fs.readdirSync(UPLOAD_DIR));

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({ error: "Unsupported file type" });
      const executedSql = executeMock.mock.calls.map(([sql]) => sql);
      expect(executedSql.some((sql) => sql.includes("INSERT INTO files"))).toBe(false);
      expect(executedSql.some((sql) => sql.includes("SELECT * FROM files WHERE id = ?"))).toBe(false);
      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(pdfParseMock).not.toHaveBeenCalled();
      expect(mammothMock.extractRawText).not.toHaveBeenCalled();

      const newFiles = [...afterFiles].filter((file) => !beforeFiles.has(file));
      expect(newFiles).toHaveLength(0);
    });
  });

  describe("DELETE /files/:id", () => {
    test("deletes a file and metadata", async () => {
      const fileRow = {
        id: 55,
        file_name: "delete-me.txt",
        file_path: "stored-file.txt",
        file_size: 1024,
        file_type: "text/plain",
        file_summary: "Mock summary",
        upload_date: "2024-01-02T00:00:00.000Z",
        file_content: "irrelevant",
      };

      executeMock.mockImplementation(async (sql) => {
        if (sql.includes("SELECT * FROM files WHERE id = ?")) {
          return [[fileRow]];
        }

        if (sql.includes("DELETE FROM files WHERE id = ?")) {
          return [{}];
        }

        return [[]];
      });

      const unlinkSpy = jest.spyOn(fs, "unlink").mockImplementation((_, cb) => cb(null));

      const response = await request(app).delete("/files/55");

      expect(response.statusCode).toBe(204);

      expect(executeMock).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM files WHERE id = ?"),
        ["55"],
      );
      expect(executeMock).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM files WHERE id = ?"),
        ["55"],
      );

      expect(axiosMock.delete).toHaveBeenCalledWith(
        "http://ml-service.test/documents/file_55",
        expect.objectContaining({ timeout: 10000 }),
      );

      expect(unlinkSpy).toHaveBeenCalledWith(
        path.join(__dirname, "../uploads", "stored-file.txt"),
        expect.any(Function),
      );

      unlinkSpy.mockRestore();
    });
  });
});

