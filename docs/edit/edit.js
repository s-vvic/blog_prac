window.addEventListener("DOMContentLoaded", async () => {
  // 1. Quill 초기화
  var quill = new Quill("#editor-container", { theme: "snow" });

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  // 2. 기존 데이터 불러와서 에디터에 채우기
  try {
    const response = await fetch(`/api/posts/${postId}`);
    const post = await response.json();

    document.getElementById("title").value = post.title;
    // Quill 에디터 안에 HTML 내용을 주입합니다.
    quill.root.innerHTML = post.content;
  } catch (err) {
    alert("데이터 로딩 실패");
  }

  // 3. 수정 완료 버튼 클릭 시
  document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const content = quill.root.innerHTML; // 에디터의 HTML을 가져옴

    await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postTitle: title, postContent: content }),
    });
    location.href = `../page/page.html?id=${postId}`;
  });
});
