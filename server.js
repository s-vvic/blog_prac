const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");
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
};

// DB 연결 풀(Pool) 생성
const pool = mysql.createPool(dbConfig);

// -----------------------------------------------------------------
// ▼ 미들웨어 (Middleware) 설정 ▼
// -----------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  res.redirect("index.html");
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
    res.redirect("board/board.html");
  } catch (error) {
    // 6. [추가] DB 오류 처리
    console.error("DB 저장 중 오류 발생:", error);
    res.status(500).send("서버 오류가 발생했습니다. DB 연결을 확인해주세요.");
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
    const posts = postsRows.map((post) => ({
      id: post.id,
      title: post.title,
      content:
        post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
      date: new Date(post.created_at).toLocaleString("ko-KR"),
    }));

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
    // 1. URL 파라미터에서 'id' 값을 가져옵니다. (req.params 사용!)
    const { id } = req.params;

    // 2. DB에서 특정 id의 글을 조회합니다. (SQL Injection 방지됨)
    const sql = "SELECT id, title, content, created_at FROM posts WHERE id = ?";
    const [rows] = await pool.execute(sql, [id]);

    // 3. [중요] 해당 id의 글이 없는 경우, 404 Not Found 응답을 보냅니다.
    if (rows.length === 0) {
      return res.status(404).send("해당 ID의 글을 찾을 수 없습니다.");
    }

    // 4. DB에서 찾은 첫 번째 (그리고 유일한) 글을 post 변수에 저장
    const post = rows[0];

    // 5. 날짜 포맷을 변경하여 최종 응답 객체를 만듭니다.
    const postDetails = {
      id: post.id,
      title: post.title,
      content: post.content, // 상세 페이지에서는 전체 내용을 보냅니다.
      date: new Date(post.created_at).toLocaleString("ko-KR"),
    };

    // 6. JSON 형태로 클라이언트에게 응답합니다.
    res.json(postDetails);
  } catch (error) {
    console.error("DB 상세 조회 중 오류 발생:", error);
    res.status(500).send("서버 오류가 발생했습니다.");
  }
});

// 정적 파일 제공 미들웨어
app.use(express.static(path.join(__dirname, "docs")));

// 404 핸들러
app.use((req, res) => {
  res.status(404).send("페이지를 찾을 수 없습니다 (404 Not Found)");
});
