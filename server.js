const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const app = express();

require("dotenv").config();

// -----------------------------------------------------------------
// ▼ MySQL DB 연결 설정 ▼
// -----------------------------------------------------------------
const dbConfig = {
  host: process.env.DB_HOST, // MySQL 서버 주소 (대부분 'localhost')
  user: process.env.DB_USER, // MySQL 사용자 이름
  password: process.env.DB_PASSWORD, // MySQL 비밀번호
  database: process.env.DB_DATABASE, // 사용할 데이터베이스(스키마) 이름
  port: process.env.DB_PORT || 3306, // 포트 정보 추가
  ssl: { rejectUnauthorized: false }, // SSL 설정 추가
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "blog_images", // Cloudinary 내 폴더 이름
    format: async (req, file) => "png", // 저장 포맷
    public_id: (req, file) => Date.now() + "-" + file.originalname,
  },
});
const upload = multer({ storage: storage });

// DB 연결 풀(Pool) 생성
const pool = mysql.createPool(dbConfig);

// -----------------------------------------------------------------
// ▼ 미들웨어 (Middleware) 설정 ▼
// -----------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// -----------------------------------------------------------------

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  // 서버가 시작될 때 DB 연결을 테스트합니다.
  try {
    const connection = await pool.getConnection();
    console.log("MySQL 데이터베이스에 성공적으로 연결되었습니다.");
    connection.release();
  } catch (error) {
    console.error("MySQL 연결 실패:", error);
  }
  console.log(`listening on ${PORT}`);
});

app.get("/", (req, res) => {
  res.redirect("index.html");
});

app.post("/api/upload", upload.single("postImage"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("파일이 업로드되지 않았습니다.");
    }
    // Cloudinary에 저장된 실제 이미지 URL 주소를 클라이언트에 돌려줍니다.
    res.json({ url: req.file.path });
  } catch (error) {
    console.error("에디터 이미지 업로드 오류:", error);
    res.status(500).send("서버 오류 발생");
  }
});

// 기존 /addPost 수정: 이제 content 안에 HTML(이미지 포함)이 통째로 들어옵니다.
app.post("/addPost", async (req, res) => {
  try {
    const { postTitle, postContent } = req.body;

    if (!postTitle || !postContent) {
      return res.status(400).send("제목과 내용을 입력해주세요.");
    }

    const sql = "INSERT INTO posts (title, content) VALUES (?, ?)";
    await pool.execute(sql, [postTitle, postContent]);

    res.redirect("board/board.html");
  } catch (error) {
    console.error("저장 오류:", error);
    res.status(500).send("서버 오류 발생");
  }
});

// -----------------------------------------------------------------
// ▼▼▼ [수정된 글 *목록* 조회 API (페이지네이션 적용)] ▼▼▼
// -----------------------------------------------------------------
app.get("/api/posts", async (req, res) => {
  try {
    // 1. 클라이언트가 요청한 페이지 번호를 가져옵니다. (쿼리 파라미터)
    // (예: /api/posts?page=2)
    const page = parseInt(req.query.page || "1", 10);
    // 한 페이지에 보여줄 글의 수
    const limit = 20;
    // DB에서 건너뛸 개수 계산
    const offset = (page - 1) * limit;

    // 2. [쿼리 1] 총 글의 개수를 셉니다. (총 페이지 수를 계산하기 위해)
    const countSql = "SELECT COUNT(*) as totalPosts FROM posts";
    const [countRows] = await pool.execute(countSql);
    const totalPosts = countRows[0].totalPosts;
    const totalPages = Math.ceil(totalPosts / limit);

    // 3. [쿼리 2] 현재 페이지만큼의 글만 가져옵니다. (LIMIT, OFFSET 사용)
    // ▼▼▼ [수정된 부분] ▼▼▼
    // ? 플레이스홀더 대신, JavaScript 템플릿 리터럴( `` )을 사용해
    // "안전하게 검증된" limit와 offset 변수를 문자열에 직접 삽입합니다.
    const postsSql = `
      SELECT id, title, content, created_at 
      FROM posts 
      ORDER BY id DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    // [limit, offset] 순서로 값을 전달합니다.
    const [postsRows] = await pool.execute(postsSql);

    // 4. 가져온 글 목록의 포맷을 변경합니다.
    const posts = postsRows.map((post) => {
      const plainText = post.content.replace(/<[^>]*>?/gm, "");

      return {
        id: post.id,
        title: post.title,
        content:
          plainText.substring(0, 50) + (plainText.length > 50 ? "..." : ""),
        date: new Date(post.created_at).toLocaleString("ko-KR"),
      };
    });

    // 5. [수정] JSON 응답에 '글 목록(posts)'과 '총 페이지 수(totalPages)'를 함께 보냅니다.
    res.json({
      posts: posts,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("DB 목록 조회 중 오류 발생:", error);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
});
// -----------------------------------------------------------------
// ▲▲▲ [수정된 글 *목록* 조회 API (페이지네이션 적용)] ▲▲▲
// -----------------------------------------------------------------

app.get("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. SELECT 문에 image_url을 추가합니다.
    const sql =
      "SELECT id, title, content, image_url, created_at FROM posts WHERE id = ?";
    const [rows] = await pool.execute(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).send("해당 ID의 글을 찾을 수 없습니다.");
    }

    const post = rows[0];

    const postDetails = {
      id: post.id,
      title: post.title,
      content: post.content,
      // 2. 응답 데이터에 image_url을 포함시킵니다.
      imageUrl: post.image_url,
      date: new Date(post.created_at).toLocaleString("ko-KR"),
    };

    res.json(postDetails);
  } catch (error) {
    console.error("DB 상세 조회 중 오류 발생:", error);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
});

// 글 삭제 로직
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send("삭제할 항목이 선택되지 않았습니다.");
    }

    // 1. 삭제 전, 해당 글의 본문을 먼저 가져옵니다.
    const [rows] = await pool.query(
      "SELECT content FROM posts WHERE id IN (?)",
      [ids],
    );
    for (const row of rows) {
      const imgRegex = /https:\/\/res\.cloudinary\.com\/[^\s"'>]+/g;
      const imageUrls = row.content.match(imgRegex) || [];
      for (const url of imageUrls) {
        const parts = url.split("/");
        const fileName = parts[parts.length - 1].split(".")[0];
        const folderName = parts[parts.length - 2];
        await cloudinary.uploader.destroy(`${folderName}/${fileName}`);
      }
    }

    // 4. 이제 DB에서 글을 삭제합니다.
    await pool.query("DELETE FROM posts WHERE id IN (?)", [ids]);
    res.status(200).send("성공적으로 삭제되었습니다.");
  } catch (error) {
    console.error("일괄 삭제 중 오류:", error);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
});

// server.js에 추가
app.put("/api/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { postTitle, postContent } = req.body;

    const sql = "UPDATE posts SET title = ?, content = ? WHERE id = ?";
    const [result] = await pool.execute(sql, [postTitle, postContent, id]);

    if (result.affectedRows === 0) {
      return res.status(404).send("수정할 글을 찾을 수 없습니다.");
    }
    res.send("수정 성공");
  } catch (error) {
    res.status(500).send("서버 오류");
  }
});

// 정적 파일 제공 미들웨어
app.use(express.static(path.join(__dirname, "docs")));

// 404 핸들러
app.use((req, res) => {
  res.status(404).send("페이지를 찾을 수 없습니다 (404 Not Found)");
});
