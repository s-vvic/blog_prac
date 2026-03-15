// HTML 문서가 모두 로드되었을 때 이 함수를 실행합니다.
window.addEventListener("DOMContentLoaded", () => {
  // 1. 브라우저 주소창에서 'id' 값을 찾아옵니다.
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");

  // 2. 만약 id 값이 존재하면,
  if (postId) {
    // 3. 그 id로 서버에 글 상세 정보를 요청하는 함수를 호출합니다.
    fetchPostDetails(postId);
    setupButtons(postId);
  } else {
    // 4. id 값이 없으면 오류 메시지를 표시합니다.
    displayError("잘못된 접근입니다. (ID가 없습니다)");
  }
});

// 수정/삭제 버튼 이벤트 등록
function setupButtons(postId) {
  const deleteBtn = document.getElementById("delete");
  const editBtn = document.getElementById("edit");

  deleteBtn.addEventListener("click", async () => {
    if (confirm("정말 이 글을 삭제하시겠습니까?")) {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("성공적으로 삭제되었습니다.");
          location.href = "../index.html";
        } else {
          alert("삭제에 실패했습니다.");
        }
      } catch (error) {
        console.error("삭제 중 오류 :", error);
      }
    }
  });

  editBtn.addEventListener("click", async () => {
    location.href = `../edit/edit.html?id=${postId}`;
  });
}

// 서버에 특정 id의 글 상세 정보를 요청하는 비동기 함수
async function fetchPostDetails(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}`);
    if (!response.ok) throw new Error(`에러: ${response.statusText}`);

    const post = await response.json();

    const titleEl = document.getElementById("post-title");
    const dateEl = document.getElementById("post-date");
    const contentEl = document.getElementById("post-content");

    titleEl.textContent = post.title;
    dateEl.textContent = `작성일: ${post.date}`;
    contentEl.innerHTML = post.content;

    // ▼ 이미지를 화면에 추가하는 로직
    if (post.imageUrl) {
      // 이미지가 들어갈 공간을 찾거나 만듭니다.
      let imgEl = document.getElementById("post-image");

      if (!imgEl) {
        imgEl = document.createElement("img");
        imgEl.id = "post-image";
        imgEl.style.maxWidth = "100%"; // 화면 너비에 맞게 조절
        imgEl.style.marginTop = "20px";
        imgEl.style.borderRadius = "8px";
        // 본문(content) 위에 이미지를 넣습니다.
        contentEl.parentNode.insertBefore(imgEl, contentEl);
      }
      imgEl.src = post.imageUrl;
    }
  } catch (error) {
    console.error("오류:", error);
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

// 수정 및 삭제 버튼
function editButton() {
  const editTitle = document.querySelector("edit");
}
