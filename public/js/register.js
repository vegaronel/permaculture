$(document).ready(function () {
    $("#termBox").hide();

    // Prevent the span click from toggling the checkbox
    $("#showTerms").on("click", function(event) {
        event.stopPropagation();  // Prevent the event from reaching the label/checkbox
        $("#termBox").show();  // Show the terms and conditions modal
    });

    // Handle the accept button
    $("#accept1").on("click", function() {
        $("#agreeTerms").prop("checked", true);
        $("#termBox").hide();  // Hide terms after accepting
    });

    // Handle the decline button
    $("#decline").on("click", function() {
        $("#agreeTerms").prop("checked", false);
        $("#termBox").hide();  // Hide terms after declining
    });
     // Email validation logic (existing code)
     $("#sendCodeBtn").on("click", function () {
          const emailInput = $("#email").val().trim();
          const emailFeedback = $("#emailFeedback");
          const emailValid = $("#emailValid");
          const emailRequired = $("#emailRequired");

          if (!emailInput) {
               emailRequired.show();
               return;
          }

          emailRequired.hide();

          $.ajax({
               url: "/check-email",
               method: "POST",
               contentType: "application/json",
               data: JSON.stringify({ email: emailInput }),
               success: function (data) {
                    if (!data.success) {
                         emailFeedback.text(data.message).show();
                         emailValid.hide();
                    } else {
                         emailFeedback.hide();
                         emailValid.show();

                         // Proceed to send the verification code
                         sendVerificationCode(emailInput);
                    }
               },
               error: function (error) {
                    console.error("Error:", error);
                    emailFeedback.text("An error occurred while checking the email").show();
                    emailValid.hide();
               },
          });
     });

     function sendVerificationCode(emailInput) {
          const btn = $("#sendCodeBtn");
          btn.prop("disabled", true);
          let timeLeft = 60;
          const timer = setInterval(function () {
               if (timeLeft <= 0) {
                    clearInterval(timer);
                    btn.prop("disabled", false).text("Re-send Code");
               } else {
                    btn.text(`${timeLeft} seconds`);
               }
               timeLeft -= 1;
          }, 1000);

          $.ajax({
               url: "/send-verification-code",
               method: "POST",
               contentType: "application/json",
               data: JSON.stringify({ email: emailInput }),
               success: function (data) {
                    if (!data.success) {
                         emailFeedback.text(data.message).show();
                         emailValid.hide();
                         clearInterval(timer);
                         btn.prop("disabled", false).text("Send Verification Code");
                    } else {
                         emailFeedback.hide();
                         emailValid.show();
                    }
               },
               error: function (error) {
                    console.error("Error:", error);
                    emailFeedback.text("An error occurred while sending the verification code.").show();
                    emailValid.hide();
                    clearInterval(timer);
                    btn.prop("disabled", false).text("Send Verification Code");
               },
          });
     }

     $("#registrationForm").on("submit", function (event) {
        event.preventDefault(); // Prevent default form submission

        let isValid = true;

        // Get form input values
        const firstname = $('input[name="firstname"]').val().trim();
        const lastname = $('input[name="lastname"]').val().trim();
        const email = $('input[name="email"]').val().trim();
        const password = $("#password").val().trim();
        const confirmPassword = $("#confirmPassword").val().trim();
        const verificationCode = $("#verificationCode").val().trim();
    

        // Clear previous validation states
        $("input").removeClass("is-invalid is-valid");
        $(".invalid-feedback").hide();

        // Validate First Name
        if (!firstname) {
            isValid = false;
            $('input[name="firstname"]').addClass("is-invalid");
            $('input[name="firstname"]').next(".invalid-feedback").text("First name is required.").show();
        } else {
            $('input[name="firstname"]').addClass("is-valid");
        }

        // Validate Last Name
        if (!lastname) {
            isValid = false;
            $('input[name="lastname"]').addClass("is-invalid");
            $('input[name="lastname"]').next(".invalid-feedback").text("Last name is required.").show();
        } else {
            $('input[name="lastname"]').addClass("is-valid");
        }

        // Validate Email
        if (!email || !validateEmail(email)) {
            isValid = false;
            $("#email").addClass("is-invalid");
            $("#emailFeedback").text("Please provide a valid email.").show();
        } else {
            $("#email").addClass("is-valid");
        }

        // Validate Password
        if (!password || password.length < 8) {
            isValid = false;
            $("#password").addClass("is-invalid");
            $("#password").next(".invalid-feedback").text("Password must be at least 8 characters long.").show();
        } else {
            $("#password").addClass("is-valid");
        }

        // Validate Confirm Password
        if (!confirmPassword || password !== confirmPassword) {
            isValid = false;
            $("#confirmPassword").addClass("is-invalid");
            $("#confirmPassword").next(".invalid-feedback").text("Passwords don't match.").show();
        } else {
            $("#confirmPassword").addClass("is-valid");
        }

        // Validate OTP
        if (!verificationCode) {
            isValid = false;
            $("#verificationCode").addClass("is-invalid");
            $("#otpFeedback").text("Please enter the OTP.").show();
        }

        if (isValid) {
            const formData = new FormData(this);
            $.ajax({
                url: "/register",
                method: "POST",
                processData: false, // Prevent jQuery from automatically transforming the data into a query string
                contentType: false, // Let the browser set the content type
                data: formData,
                success: function (data) {
                    if (data.success) {
                        window.location.href = "/login";
                    } else {
                        $("#otpFeedback").text(data.message).show(); // Show error message
                    }
                },
                error: function (error) {
                    console.error("Error:", error);
                    $("#otpFeedback").text("An error occurred during registration.").show();
                }
            });
        }
    });

    // Function to validate email format
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }


});
