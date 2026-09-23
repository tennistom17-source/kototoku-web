const KOTOTOKU_VIDEOS = [
  {
    id: "kototoku-movie-01",
    title: "コトトク極秘ミッション",
    episode: "動画制作・第1弾",
    description: "コトトクの5人が、みんなの困りごとの解決に挑む最初の映像作品です。",
    thumbnail: "",
    videoUrl: "images/movie/kototoku-movie-01.mp4",
    instagramUrl: "",
    diaryUrl: "",
    promptUrl: "",
    tags: ["生成AI", "CapCut", "アクション", "制作第1弾"]
  },
  {
    id: "discussion-02",
    title: "議論を始めた社員たち",
    episode: "第2弾",
    description: "ようやく動き始めたAI社員。しかし全員の意見が止まらない。",
    thumbnail: "",
    videoUrl: "",
    instagramUrl: "",
    diaryUrl: "",
    promptUrl: "",
    tags: ["AI社員", "コメディ", "制作日記"]
  },
  {
    id: "shadow-03",
    title: "言葉を喰らう影",
    episode: "企画中",
    description: "言葉を奪う黒い影に、5人とあすくんが挑む物語。",
    thumbnail: "",
    videoUrl: "",
    instagramUrl: "",
    diaryUrl: "",
    promptUrl: "",
    tags: ["ダークファンタジー", "アニメ", "あすくん"]
  }
];

const KOTOTOKU_INSTAGRAM_URL = "";

(() => {
  "use strict";
  const find = selector => document.querySelector(selector);
  const track = (name, details = {}) => {
    if (typeof globalThis.gtag === "function") globalThis.gtag("event", name, details);
  };
  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  function mediaFor(video) {
    const frame = makeElement("div", "vertical-media");
    if (video.videoUrl) {
      const player = document.createElement("video");
      player.controls = true;
      player.playsInline = true;
      player.preload = "metadata";
      player.width = 720;
      player.height = 1280;
      player.setAttribute("aria-label", `${video.title}の動画`);
      if (video.thumbnail) player.poster = video.thumbnail;
      const source = document.createElement("source");
      source.type = "video/mp4";
      player.append(source, document.createTextNode("お使いのブラウザでは動画を再生できません。"));
      player.addEventListener("play", () => track("movie_video_play", { video_id: video.id, video_title: video.title }), { once: true });
      const loadButton = makeElement("button", "video-load", "動画を読み込む");
      loadButton.type = "button";
      loadButton.addEventListener("click", () => {
        source.src = video.videoUrl;
        player.load();
        loadButton.remove();
      }, { once: true });
      frame.append(player, loadButton);
      return frame;
    }
    if (video.thumbnail) {
      const image = document.createElement("img");
      image.src = video.thumbnail;
      image.alt = `${video.title}のサムネイル`;
      image.loading = "lazy";
      image.width = 720;
      image.height = 1280;
      frame.append(image);
      return frame;
    }
    const waiting = makeElement("div");
    waiting.append(makeElement("span", "film-mark"), makeElement("b", "", "動画を準備中"), makeElement("small", "", "公開までお待ちください"));
    frame.append(waiting);
    return frame;
  }

  function actionLink(url, label, eventName, video) {
    if (!url) return null;
    const link = makeElement("a", "video-action", label);
    link.href = url;
    if (/^https?:\/\//.test(url)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.addEventListener("click", () => track(eventName, { movie_id: video.id, movie_title: video.title }));
    return link;
  }

  function renderVideos() {
    const list = find("#video-list");
    KOTOTOKU_VIDEOS.forEach(video => {
      const card = makeElement("article", "video-card");
      card.id = video.id;
      card.append(makeElement("span", "video-episode", video.episode), makeElement("h3", "", video.title), mediaFor(video), makeElement("p", "", video.description));
      const tags = makeElement("div", "movie-tags");
      tags.setAttribute("aria-label", "タグ");
      video.tags.forEach(tag => tags.append(makeElement("span", "movie-tag", tag)));
      card.append(tags);
      const actions = makeElement("div", "video-actions");
      const links = [
        actionLink(video.instagramUrl, "Instagramで見る", "movie_instagram_click", video),
        actionLink(video.diaryUrl, "制作日記", "movie_diary_click", video),
        actionLink(video.promptUrl, "使用したプロンプト", "movie_prompt_click", video)
      ].filter(Boolean);
      links.forEach(link => actions.append(link));
      if (links.length) card.append(actions);
      list.append(card);
    });
    const latest = KOTOTOKU_VIDEOS.find(video => video.videoUrl || video.thumbnail);
    if (latest?.thumbnail) {
      const hero = find(".hero-media");
      const image = document.createElement("img");
      image.src = latest.thumbnail;
      image.alt = `${latest.title}のサムネイル`;
      image.loading = "lazy";
      image.width = 720;
      image.height = 1280;
      hero.replaceChildren(image);
      hero.setAttribute("aria-label", `${latest.title}の最新動画`);
    }
  }

  const pollChoices = ["和風ダークファンタジー", "近未来スパイアクション", "AI社員のお仕事コメディ", "あすくんの大冒険"];
  const pollKey = "kototoku-movie-poll-v1";
  let selectedPoll = null;
  try { selectedPoll = localStorage.getItem(pollKey); } catch {}
  if (!pollChoices.includes(selectedPoll)) selectedPoll = null;

  function savePoll(value) {
    selectedPoll = value;
    try { localStorage.setItem(pollKey, value); } catch {}
    track("movie_poll_vote", { movie_poll_choice: value });
    renderPoll();
  }

  function renderPoll() {
    const options = find("#poll-options");
    const results = find("#poll-results");
    options.replaceChildren();
    results.replaceChildren();
    pollChoices.forEach(choice => {
      const button = makeElement("button", "poll-option", choice);
      button.type = "button";
      button.setAttribute("aria-pressed", String(choice === selectedPoll));
      button.addEventListener("click", () => savePoll(choice));
      options.append(button);
      const row = makeElement("div", "poll-row");
      row.append(makeElement("span", "", choice), makeElement("span", "poll-count", choice === selectedPoll ? "1票" : "0票"));
      const trackElement = makeElement("span", "poll-track");
      const bar = makeElement("span", "poll-bar");
      bar.style.width = choice === selectedPoll ? "100%" : "0%";
      trackElement.append(bar);
      row.append(trackElement);
      results.append(row);
    });
    find("#poll-reset").hidden = !selectedPoll;
  }

  find("#poll-reset").addEventListener("click", () => {
    selectedPoll = null;
    try { localStorage.removeItem(pollKey); } catch {}
    renderPoll();
  });

  function renderInstagram() {
    if (!KOTOTOKU_INSTAGRAM_URL) return;
    const container = find("#instagram-contact");
    container.replaceChildren();
    const link = makeElement("a", "primary-link", "Instagramでアイデアを送る");
    link.href = KOTOTOKU_INSTAGRAM_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    container.append(link);
  }

  document.querySelectorAll(".tracked-tool").forEach(link => link.addEventListener("click", () => track("movie_tool_click", { link_url: link.href })));
  document.querySelectorAll('a[href="#production-diary"]').forEach(link => link.addEventListener("click", () => track("movie_diary_click", { link_url: link.href })));
  renderVideos();
  renderPoll();
  renderInstagram();
})();
