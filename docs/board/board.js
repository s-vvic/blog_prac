// HTML 문서가 모두 로드되었을 때 이 함수를 실행합니다.
window.addEventListener("DOMContentLoaded", () => {
  // 1. URL의 해시(#)에서 페이지 번호를 읽어옵니다. 없으면 1페이지.
  // (예: .../board.html#3 -> 3페이지)
  const initialPage = parseInt(window.location.hash.substring(1), 10) || 1;

  // 2. 첫 페이지 로드를 시작합니다.
  fetchPosts(initialPage);

  // 3. 페이지네이션 버튼 클릭에 대한 이벤트 리스너를 <nav>에 한 번만 등록 (이벤트 위임)
  const paginationNav = document.getElementById("pagination-nav");
  if (paginationNav) {
    paginationNav.addEventListener("click", (e) => {
      // 클릭된 요소가 <button>이 맞는지 확인
      const button = e.target.closest("button");
      if (!button) return; // 버튼이 아니면 무시

      // 버튼에 저장된 data-page 속성 값을 읽어옵니다.
      const page = button.dataset.page;

      // data-page 값이 존재하면 해당 페이지로 이동
      if (page) {
        fetchPosts(parseInt(page, 10));
      }
    });
  }
});

/**
 * [메인 함수] 특정 페이지의 글 목록과 페이지네이션을 가져와서 그립니다.
 * @param {number} page - 불러올 페이지 번호
 */
async function fetchPosts(page = 1) {
  const postListElement = document.getElementById("post-list");
  const paginationNav = document.getElementById("pagination-nav");

  // 1. 로딩 상태 표시
  postListElement.innerHTML = "<li>글 목록을 불러오는 중...</li>";
  paginationNav.innerHTML = ""; // 페이지 버튼 숨김 (로딩 중)

  try {
    // 2. 서버에 'page' 쿼리 파라미터와 함께 데이터를 요청합니다.
    const response = await fetch(`/api/posts?page=${page}`);

    if (!response.ok) {
      throw new Error("서버에서 글을 가져오는데 실패했습니다.");
    }

    // 3. 서버 응답을 JSON 객체로 파싱합니다.
    // (이제 { posts: [...], totalPages: N, currentPage: M } 형태)
    const data = await response.json();

    // 4. 글 목록 렌더링 함수 호출
    renderPosts(data.posts, postListElement);

    // 5. 페이지네이션 버튼 렌더링 함수 호출
    renderPagination(data.totalPages, data.currentPage, paginationNav);

    // 6. (UX) URL의 해시를 업데이트하여 현재 페이지를 기억하게 합니다.
    window.location.hash = page;
  } catch (error) {
    // 8. 오류 발생 시
    console.error("글 목록 로딩 중 오류:", error);
    postListElement.innerHTML = `<li>오류가 발생했습니다: ${error.message}</li>`;
  }
}

/**
 * [헬퍼 함수] 받아온 'posts' 배열을 <li> 태그로 변환하여 화면에 그립니다.
 * @param {Array} posts - 서버에서 받아온 글 목록 배열
 * @param {HTMLElement} postListElement - <ul> 태그 요소
 */
function renderPosts(posts, postListElement) {
  postListElement.innerHTML = ""; // 로딩 메시지 또는 이전 목록 제거

  // 5. 만약 글이 하나도 없으면 메시지를 표시합니다.
  if (posts.length === 0) {
    postListElement.innerHTML = "<li>이 페이지에는 글이 없습니다.</li>";
    return;
  }

  // 6. 받아온 'posts' 배열을 순회하면서 HTML을 만듭니다.
  posts.forEach((post) => {
    const postItem = document.createElement("li");

    // (이전과 동일한 <a> 태그 생성 로직)
    const linkElement = document.createElement("a");
    linkElement.className = "post-link";
    linkElement.href = `../page/page.html?id=${post.id}`;

    const titleEl = document.createElement("h3");
    titleEl.textContent = post.title;

    const contentEl = document.createElement("p");
    contentEl.textContent = post.content; // (서버에서 이미 50자로 잘라줌)

    const dateEl = document.createElement("small");
    dateEl.textContent = post.date;

    linkElement.appendChild(titleEl);
    linkElement.appendChild(contentEl);
    linkElement.appendChild(document.createElement("br"));
    linkElement.appendChild(dateEl);

    postItem.appendChild(linkElement);
    postListElement.appendChild(postItem);
  });
}

/**
 * [헬퍼 함수] 페이지네이션 버튼들을 생성하여 화면에 그립니다.
 * @param {number} totalPages - 전체 페이지 수
 * @param {number} currentPage - 현재 페이지 번호
 * @param {HTMLElement} paginationNav - <nav> 태그 요소
 */
function renderPagination(totalPages, currentPage, paginationNav) {
  paginationNav.innerHTML = ""; // 기존 버튼 제거

  // 총 페이지가 1 이하면 버튼을 그릴 필요가 없음
  if (totalPages <= 1) return;

  // --- "이전" 버튼 ---
  const prevButton = document.createElement("button");
  prevButton.textContent = "이전";
  prevButton.disabled = currentPage === 1; // 1페이지일 때 비활성화
  prevButton.dataset.page = currentPage - 1; // 클릭 시 이동할 페이지
  paginationNav.appendChild(prevButton);

  // --- 페이지 번호 버튼 ---
  // (간단한 버전: 모든 페이지 번호를 다 그림)
  // (개선 버전: 1 ... 4 5 6 ... 10 처럼 중간을 생략할 수 있음)
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.dataset.page = i;

    if (i === currentPage) {
      pageButton.classList.add("active"); // 현재 페이지 활성화 스타일
      pageButton.disabled = true; // 현재 페이지 버튼은 비활성화
    }
    paginationNav.appendChild(pageButton);
  }

  // --- "다음" 버튼 ---
  const nextButton = document.createElement("button");
  nextButton.textContent = "다음";
  nextButton.disabled = currentPage === totalPages; // 마지막 페이지일 때 비활성화
  nextButton.dataset.page = currentPage + 1;
  paginationNav.appendChild(nextButton);
}
