// 1. Quill 에디터 초기화
var quill = new Quill("#editor-container", {
  modules: {
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      ["image", "code-block"],
    ],
    imageResize: {
      modules: ["Resize", "DisplaySize", "Toolbar"],
    },
  },
  theme: "snow",
});

// 2. 이미지 핸들러 (Cloudinary 업로드 로직)
const toolbar = quill.getModule("toolbar");
toolbar.addHandler("image", () => {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/*");
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    const formData = new FormData();
    formData.append("postImage", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      const range = quill.getSelection();
      quill.insertEmbed(range.index, "image", data.url);
    } catch (err) {
      console.error("이미지 업로드 실패:", err);
    }
  };
});

// 3. 폼 전송 시 에디터 내용을 hidden input에 담기
const form = document.getElementById("post-form");
if (form) {
  form.onsubmit = function () {
    const contentInput = document.querySelector("#postContent");
    contentInput.value = quill.root.innerHTML; // HTML 전체를 담습니다.
  };
}
