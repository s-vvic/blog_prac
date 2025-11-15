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
    postListElement.innerHTML = "";

    // 5. 만약 글이 하나도 없으면 메시지를 표시합니다.
    if (posts.length === 0) {
      postListElement.innerHTML =
        "<li>아직 등록된 글이 없습니다. 첫 번째 글을 작성해보세요!</li>";
      return;
    }

    // 6. 받아온 'posts' 배열을 순회하면서 HTML을 만듭니다.
    posts.forEach((post) => {
      // ul 안에 넣을 li 생성
      const postItem = document.createElement("li");

      // 각 페이지 이동을 위한 a 생성
      const linkElement = document.createElement("a");
      // <a> 태그에 post-link 클래스 추가 (스타일링용)
      linkElement.className = "post-link";

      // [중요] 링크 주소를 동적으로 만듭니다.
      // 예: ../page/page.html?id=1, ../page/page.html?id=2 ...
      // 이렇게 해야 상세 페이지에서 '어떤 글'을 보여줄지 알 수 있습니다.
      linkElement.href = `../page/page.html?id=${post.id}`;

      // XSS(Cross-Site Scripting) 방지를 위해 텍스트를 안전하게 처리합니다.
      const titleEl = document.createElement("h3");
      titleEl.textContent = post.title; // XSS 방지

      const contentEl = document.createElement("p");
      contentEl.textContent = post.content; // XSS 방지

      const dateEl = document.createElement("small");
      dateEl.textContent = post.date; // DB에서 가져온 날짜

      // <a> 안에 생성된 요소들을 추가합니다.
      linkElement.appendChild(titleEl);
      linkElement.appendChild(contentEl);
      linkElement.appendChild(document.createElement("br"));
      linkElement.appendChild(dateEl);

      // --- 5. 완성된 <a> 태그를 <li>에 넣습니다 ---
      postItem.appendChild(linkElement);

      // --- 6. 완성된 <li> 태그를 <ul>에 넣습니다 ---
      postListElement.appendChild(postItem);
    });
  } catch (error) {
    // 8. 오류 발생 시 콘솔과 화면에 오류 메시지를 표시합니다.
    console.error("글 목록 로딩 중 오류:", error);
    const postListElement = document.getElementById("post-list");
    postListElement.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
  }
}
