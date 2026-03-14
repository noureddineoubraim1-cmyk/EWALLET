const database={

    users:[
 {id:"1",
  name:"Ali", 
  email:"Ali@example.com",
  password:"1232",
  wallet:{
   balance:15812, 
   currency:"MAD",
   cards:[
     {numcards:"124847", type:"visa", balance:14012, expiry:"14-08-27", vcc:"147"},
     {numcards:"124478", type:"mastercard", balance:1800, expiry:"14-08-28", vcc:"257"},
   ],
   transactions:[
     {id:"1", type:"credit", amount:140, date:"14-08-25", from:"Ahmed", to:"124847"},
     {id:"2", type:"debit", amount:200, date:"13-08-25", from:"124847", to:"Amazon"},
     {id:"3", type:"credit", amount:250, date:"12-08-25", from:"Ahmed", to:"124478"},
   ]
  }
 },

 {id:"2",
  name:"Sara", 
  email:"sara@example.com",
  password:"1232",
  wallet:{
   balance:9200,
   currency:"MAD",
   cards:[
     {numcards:"987654", type:"visa", balance:9200, expiry:"10-09-27", vcc:"321"},
   ],
   transactions:[
     {id:"1", type:"credit", amount:500, date:"10-08-25", from:"Youssef", to:"987654"},
     {id:"2", type:"debit", amount:120, date:"09-08-25", from:"987654", to:"Netflix"},
   ]
  }
 },

 {id:"3",
  name:"Omar", 
  email:"omar@example.com",
  password:"1232",
  wallet:{
   balance:4300,
   currency:"MAD",
   cards:[
     {numcards:"456321", type:"mastercard", balance:4300, expiry:"02-11-28", vcc:"654"},
   ],
   transactions:[
     {id:"1", type:"debit", amount:50, date:"05-08-25", from:"456321", to:"Spotify"},
     {id:"2", type:"credit", amount:200, date:"04-08-25", from:"Karim", to:"456321"},
   ]
  }
 },

 {id:"4",
  name:"Yasmine", 
  email:"yasmine@example.com",
  password:"1232",
  wallet:{
   balance:15000,
   currency:"MAD",
   cards:[
     {numcards:"741258", type:"visa", balance:15000, expiry:"06-12-29", vcc:"852"},
   ],
   transactions:[
     {id:"1", type:"credit", amount:1000, date:"01-08-25", from:"Company", to:"741258"},
     {id:"2", type:"debit", amount:300, date:"31-07-25", from:"741258", to:"Apple"},
   ]
  }
 }
]
}







if (!localStorage.getItem("db_users")) {
  localStorage.setItem("db_users", JSON.stringify(database.users));
}


export const getUsers = () => JSON.parse(localStorage.getItem("db_users"));


export const saveUsers = (users) => {
  localStorage.setItem("db_users", JSON.stringify(users));
};


export const finduserbymail = (mail, password) => {
  const users = getUsers();
  return users.find((u) => u.email === mail && u.password === password);
};


export const finduserbyname = (name) => {
  const users = getUsers();
  return users.find((u) => u.name === name);
}