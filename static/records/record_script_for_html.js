// Функция для загрузки и добавления HTML-содержимого
function loadHTMLTemplate(callback) {
  fetch('../records/record_game.html')
      .then(response => response.text())
      .then(html => {
          document.body.insertAdjacentHTML('beforeend', html);

          var recordIcon = document.getElementById('recordIcon');
          var recordModal = document.getElementById('recordModal');
          var closeModal = document.getElementById('closeModal');

          recordIcon.onclick = function() {
              recordModal.style.display = 'block';
          };

          closeModal.onclick = function() {
              recordModal.style.display = 'none';
          };

          window.onclick = function(event) {
              if (event.target == recordModal) {
                  recordModal.style.display = 'none';
              }
          };

          if (callback) {
              callback();
          }
      })
      .catch(error => console.error('Error loading HTML template:', error));
}

// Вызов функции при загрузке страницы
loadHTMLTemplate(() => {
  console.log('HTML template loaded and event listeners are set up.');
  // Call any initialization function here if needed
});
