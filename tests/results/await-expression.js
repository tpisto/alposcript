async function fetchData() {
  let res;
  res = await fetch(searchUrl);
  return res;
}
