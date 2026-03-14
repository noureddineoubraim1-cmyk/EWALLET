import { finduserbymail } from "../models/database.js";

const submitBtn = document.getElementById("submitbtn");



submitBtn.addEventListener("click", ()=> {
    const mail = document.getElementById("mail").value;
    const pass = document.getElementById("password").value;

    const user = finduserbymail(mail,pass);

    if(user){
        sessionStorage.setItem("currentUser", JSON.stringify(user));

        setTimeout(()=> {
            window.location.href = "/src/view/dashboard.html";
        },0)


    } else{
        alert("donnees invalide");

    }
})