document.addEventListener("DOMContentLoaded", function() {

    new DataTable('#example',{
            order: [[6, 'desc']]
        });

    var getButtons = document.querySelectorAll(".get-button");

    getButtons.forEach(function(button) {
      button.addEventListener("click", function(event) {
        var donationId = button.getAttribute("data-id");
        var form = document.getElementById("get-form-" + donationId);
        form.submit();
      });
    });
  });