// modify_schema.js
const mysql = require("mysql2/promise");
require("dotenv").config();

async function updateSchema() {
  // server.js의 설정과 동일하게 연결합니다
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 16284, // 사용자님의 Aiven 포트 확인
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Aiven MySQL 연결 중...");

    // content 컬럼의 타입을 MEDIUMTEXT로 변경합니다.
    // 이렇게 하면 약 1,600만 자(이미지 포함 HTML)까지 저장 가능합니다.
    const sql = "ALTER TABLE posts MODIFY COLUMN content MEDIUMTEXT";

    await connection.execute(sql);
    console.log("✅ 성공: content 컬럼이 MEDIUMTEXT로 변경되었습니다.");
  } catch (err) {
    console.error("❌ 오류 발생:", err.message);
  } finally {
    await connection.end();
  }
}

updateSchema();
