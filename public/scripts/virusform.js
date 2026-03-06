
function virusForm() {
    const number = document.getElementById('number').value.trim();
    const name = document.getElementById('name').value.trim();

    if (!number || !name) {
        alert("Number and Name cannot be empty.");
        return false;
    }

    return true;
}
