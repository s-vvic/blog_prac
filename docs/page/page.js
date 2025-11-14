// HTML 문서가 모두 로드되었을 때 이 함수를 실행합니다.
window.addEventListener("DOMContentLoaded", () => {
  // 1. 브라우저 주소창에서 'id' 값을 찾아옵니다.
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  // 2. 만약 id 값이 존재하면,
  if (postId) {
    // 3. 그 id로 서버에 글 상세 정보를 요청하는 함수를 호출합니다.
    fetchPostDetails(postId);
  } else {
    // 4. id 값이 없으면 오류 메시지를 표시합니다.
    displayError("잘못된 접근입니다. (ID가 없습니다)");
  }
});

// 서버에 특정 id의 글 상세 정보를 요청하는 비동기 함수
async function fetchPostDetails(postId) {
  try {
    // [중요] server.js에 새로 추가한 API 엔드포인트를 호출합니다.
    // 예: /api/posts/5
    const response = await fetch(`/api/posts/${postId}`);

    // 404 (찾을 수 없음) 등 서버가 오류를 반환한 경우
    if (!response.ok) {
      // response.statusText는 "Not Found" 같은 문자열입니다.
      throw new Error(`글을 찾을 수 없습니다. (에러: ${response.statusText})`);
    }

    // 5. 성공 응답(response)을 JSON 형태로 파싱합니다.
    const post = await response.json();

    // 6. 받아온 post 객체의 정보로 HTML 내용을 채웁니다.
    const titleEl = document.getElementById("post-title");
    const dateEl = document.getElementById("post-date");
    const contentEl = document.getElementById("post-content");

    // 로딩 메시지를 지우고, 클래스도 제거
    titleEl.textContent = post.title;
    titleEl.classList.remove("loading");

    dateEl.textContent = `작성일: ${post.date}`;

    // XSS 방지를 위해 textContent를 사용합니다.
    // (page.html의 CSS 'white-space: pre-wrap'이 줄바꿈을 처리해줍니다)
    contentEl.textContent = post.content;
  } catch (error) {
    // 7. fetch 요청이나 데이터 처리 중 오류가 발생하면,
    console.error("글 상세 정보 로딩 중 오류:", error);
    displayError(error.message);
  }
}

// 화면에 오류 메시지를 표시하는 헬퍼 함수
function displayError(message) {
  const container = document.querySelector(".container");
  if (container) {
    container.innerHTML = `
            <h1 style="color: red;">오류 발생</h1>
            <p>${message}</p>
            <a href="../board/board.html" class="back-link">← 목록으로 돌아가기</a>
        `;
  }
}
