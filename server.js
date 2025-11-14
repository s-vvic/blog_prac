const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
const app = express();

require("dotenv").config();

// -----------------------------------------------------------------
// ▼ MySQL DB 연결 설정 ▼
// -----------------------------------------------------------------
// ⚠️ 주의: 이 값들을 본인의 로컬 DB 설정에 맞게 수정하세요!
const dbConfig = {
  host: process.env.DB_HOST, // MySQL 서버 주소 (대부분 'localhost')
  user: process.env.DB_USER, // MySQL 사용자 이름
  password: process.env.DB_PASSWORD, // MySQL 비밀번호
  database: process.env.DB_DATABASE, // 사용할 데이터베이스(스키마) 이름
};

// DB 연결 풀(Pool) 생성
const pool = mysql.createPool(dbConfig);

// -----------------------------------------------------------------
// ▼ POST 요청 처리를 위한 미들웨어 (Middleware) 추가 ▼
// -----------------------------------------------------------------
// express.json(): 요청 본문(body)이 JSON 형태일 때 파싱(해석)해줍니다.
app.use(express.json());
// express.urlencoded(): HTML 폼(form)에서 'application/x-www-form-urlencoded'
// 형태로 전송된 데이터를 파싱해줍니다. { extended: true }는 복잡한 객체도
// 파싱할 수 있게 해주는 옵션입니다.
// 이 코드가 있어야 req.body에서 폼 데이터를 볼 수 있습니다!
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
// -----------------------------------------------------------------

app.listen(8080, async () => {
  // 서버가 시작될 때 DB 연결을 테스트합니다.
  try {
    const connection = await pool.getConnection();
    console.log("MySQL 데이터베이스에 성공적으로 연결되었습니다.");
    connection.release();
  } catch (error) {
    console.error("MySQL 연결 실패:", error);
  }
  console.log("listening on 8080");
});

app.get("/", (req, res) => {
  res.redirect("docs/index.html");
});

// -----------------------------------------------------------------
// ▼ 새로운 글 작성을 위한 POST 라우터 ▼
// -----------------------------------------------------------------
app.post("/addPost", async (req, res) => {
  try {
    // 1. 클라이언트가 보낸 데이터를 req.body에서 가져옵니다.
    const { postTitle, postContent } = req.body;

    // 2. 유효성 검사
    if (!postTitle || !postContent) {
      return res.status(400).send("제목과 내용을 모두 입력해야 합니다.");
    }

    // 3. [수정] DB에 데이터를 INSERT 합니다.
    // SQL Injection 방지를 위해 '?' 플레이스홀더 사용
    const sql = "INSERT INTO posts (title, content) VALUES (?, ?)";

    // pool.execute를 사용하면 연결-실행-반환이 한번에 처리됩니다.
    const [result] = await pool.execute(sql, [postTitle, postContent]);

    // 4. 서버 콘솔에 로그를 남깁니다.
    console.log("새 글이 DB에 등록되었습니다 (ID: " + result.insertId + ")");

    // 5. 글 작성이 완료되면, 게시판 페이지(/board.html)로 이동시킵니다.
    res.redirect("docs/board/board.html");
  } catch (error) {
    // 6. [추가] DB 오류 처리
    console.error("DB 저장 중 오류 발생:", error);
    res.status(500).send("서버 오류가 발생했습니다. DB 연결을 확인해주세요.");
  }
});

/**
 * [GET /api/posts]
 * 'MySQL DB'에서 모든 글 목록을 조회하여 JSON 형태로 반환합니다.
 */
app.get("/api/posts", async (req, res) => {
  // async 추가
  try {
    // 1. [수정] DB에서 글 목록을 조회합니다.
    // 최신 글이 위로 오도록 id 내림차순(DESC)으로 정렬합니다.
    const sql =
      "SELECT id, title, content, created_at FROM posts ORDER BY id DESC";

    // [rows]는 조회된 결과 배열, [fields]는 컬럼 정보입니다.
    const [rows] = await pool.execute(sql);

    // 2. [추가] board.html 호환을 위해 데이터 포맷을 변경합니다.
    // (DB의 'created_at'을 'date' 문자열로 변경)
    const posts = rows.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      // (DATETIME 객체를 한국 시간 문자열로 변환)
      date: new Date(post.created_at).toLocaleString("ko-KR"),
    }));

    // 3. JSON 형태로 클라이언트에게 응답합니다.
    res.json(posts);
  } catch (error) {
    // 4. [추가] DB 오류 처리
    console.error("DB 조회 중 오류 발생:", error);
    res.status(500).send("서버 오류가 발생했습니다. DB 연결을 확인해주세요.");
  }
});
