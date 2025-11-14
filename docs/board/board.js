// HTML 문서가 모두 로드되었을 때 이 함수를 실행합니다.
window.addEventListener("DOMContentLoaded", () => {
  fetchPosts(); // 글 목록을 가져오는 함수 호출
});

// 서버에서 글 목록을 비동기(async)로 가져오는 함수
async function fetchPosts() {
  try {
    // 1. 서버의 /api/posts 엔드포인트에 데이터를 요청합니다.
    const response = await fetch("/api/posts");

    if (!response.ok) {
      throw new Error("서버에서 글을 가져오는데 실패했습니다.");
    }

    // 2. 응답(response)을 JSON 형태로 파싱합니다.
    const posts = await response.json();

    // 3. 글 목록을 표시할 <ul> 요소를 가져옵니다.
    const postListElement = document.getElementById("post-list");

    // 4. "로딩 중..." 메시지를 지웁니다.
    postListElement.innerHTML =
      "<li>" +
      "<!-- 글로 이동하기 예시-->" +
      '<a href="../page/page.html" id="test">' +
      "<h3>글 페이지 이동 예시</h3>" +
      "<p>content</p>" +
      "<br>" +
      "<small>2025.xx.xx</small>" +
      "</a>" +
      "</li>";
    //

    // 5. 만약 글이 하나도 없으면 메시지를 표시합니다.
    if (posts.length === 0) {
      postListElement.innerHTML =
        "<li>아직 등록된 글이 없습니다. 첫 번째 글을 작성해보세요!</li>";
      return;
    }

    // 6. 받아온 'posts' 배열을 순회하면서 HTML을 만듭니다.
    posts.forEach((post) => {
      const postItem = document.createElement("li");

      // XSS(Cross-Site Scripting) 방지를 위해 텍스트를 안전하게 처리합니다.
      const title = document.createTextNode(post.title);
      const content = document.createTextNode(post.content);
      const date = document.createTextNode(post.date);

      const titleEl = document.createElement("h3");
      titleEl.appendChild(title);

      const contentEl = document.createElement("p");
      contentEl.appendChild(content);

      const dateEl = document.createElement("small");
      dateEl.appendChild(date);

      // <li> 안에 생성된 요소들을 추가합니다.
      postItem.appendChild(titleEl);
      postItem.appendChild(contentEl);
      postItem.appendChild(document.createElement("br")); // 줄바꿈
      postItem.appendChild(dateEl);

      // 7. 완성된 <li>를 <ul>에 추가합니다.
      postListElement.appendChild(postItem);
    });
  } catch (error) {
    // 8. 오류 발생 시 콘솔과 화면에 오류 메시지를 표시합니다.
    console.error("글 목록 로딩 중 오류:", error);
    const postListElement = document.getElementById("post-list");
    postListElement.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
  }
}
