const myForm = document.getElementById('myform')
myForm.addEventListener('submit', function(event) {
  const data = [...new FormData(this)];

  let confirmMessage = '以下の内容で送信してもよろしいですか？\n\n';
  for (const [fieldName, fieldValue] of data) {
    if (fieldName === '_csrf' || fieldName === "token") {
      continue;
    } else {
      confirmMessage += `${fieldName}: ${fieldValue}\n`
    }
  }

  if (!window.confirm(confirmMessage)) {
    event.preventDefault();
  }
});
