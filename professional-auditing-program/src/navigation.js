// This script handles navigation between homepage and auditing program pages

document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();

  // Add event listener to "Get Started" button on homepage
  if (currentPage === 'home.html') {
    const getStartedBtn = document.querySelector('.btn-start');
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'index.html';
      });
    }
  }

  // Add event listener to "Home" button on auditing program page
  if (currentPage === 'index.html') {
    const homeBtn = document.querySelector('.btn-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'home.html';
      });
    }
  }
});
