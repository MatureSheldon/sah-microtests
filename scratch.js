async function run() {
  const url = "https://script.google.com/macros/s/AKfycbzXyI5c4pvpTU8wIqzX4Tz6G2wGFUXQaY335ueCXXYFb0McKiDWOKcvpS3x_YK7kcpsFA/exec";
  const getUrl = new URL(url);
  getUrl.searchParams.set('action', 'getChapterConcepts');
  getUrl.searchParams.set('class_id', 'CLASS_8');
  getUrl.searchParams.set('subject_id', 'MATH');
  getUrl.searchParams.set('chapter_id', 'MATH8_CH01');
  
  const res = await fetch(getUrl.toString());
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
