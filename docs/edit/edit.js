window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  // 1. 기존 데이터 불러와서 폼에 채우기
  try {
    const response = await fetch(`/api/posts/${postId}`);
    const post = await response.json();

    document.getElementById("title").value = post.title;
    document.getElementById("content").value = post.content;
  } catch (err) {
    alert("데이터를 불러오지 못했습니다.");
  }

  // 2. 수정된 데이터 전송하기
  document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT", // 수정을 의미하는 PUT 메서드 사용
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postTitle: title, postContent: content }),
    });

    if (res.ok) {
      alert("수정되었습니다.");
      location.href = `../page/page.html?id=${postId}`;
    }
  });
});
