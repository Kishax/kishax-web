function validateInput(input) {
    const value = input.value;
    if (value.length !== 6 || !/^\d+$/.test(value)) {
        input.setCustomValidity("6桁の半角数字を入力してください。");
    } else {
        input.setCustomValidity("");
    }
}
