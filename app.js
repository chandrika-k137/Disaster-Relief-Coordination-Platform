document.addEventListener("DOMContentLoaded", () => {

  // ================== FIREBASE CONFIG ==================
  const firebaseConfig = {
    apiKey: "AIzaSyCNDfb7LiYhVIPnm5VGclwuTbah56LpuSU",
    authDomain: "rescuenet-e5b36.firebaseapp.com",
    projectId: "rescuenet-e5b36",
    storageBucket: "rescuenet-e5b36.firebasestorage.app",
    messagingSenderId: "153940699382",
    appId: "1:153940699382:web:829cd5824ba0a1ab71a4d7",
    measurementId: "G-11TL10ZX05"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // ================== ELEMENTS ==================
  const mainView = document.getElementById("mainView");
  const dashboardView = document.getElementById("dashboardView");
  const alerts = document.getElementById("alerts");
  const nameInput = document.getElementById("name");
  const needInput = document.getElementById("need");
  const aiPreview = document.getElementById("aiPreview");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const params = new URLSearchParams(window.location.search);
  const isDashboard = params.get("dashboard") === "true";

  // ================== GOOGLE MAP VARIABLES ==================
  let map, markers = [], bounds;

  window.initMap = function() {
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 19.0760, lng: 72.8777 },
      zoom: 5
    });
    bounds = new google.maps.LatLngBounds();
  }

  function addMarker(lat, lng, title, priority) {
    const pos = new google.maps.LatLng(lat, lng);
    const marker = new google.maps.Marker({
      position: pos,
      map,
      title,
      icon: getMarkerIcon(priority)
    });
    markers.push(marker);
    bounds.extend(pos);
  }

  function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    bounds = new google.maps.LatLngBounds();
  }

  function getMarkerIcon(priority) {
    if (priority === "High") return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
    if (priority === "Medium") return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
    return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
  }

  // ================== AI FUNCTION ==================
  async function categorizeSOS(text) {
    try {
      const keywordsHigh = ["brain", "injury", "bleeding", "fracture", "hospital", "unconscious", "accident", "fire", "trapped"];
      const keywordsMedium = ["stuck", "flood", "evacuation", "rescue", "power failure"];
      const keywordsLow = ["food", "water", "shelter", "supplies", "information"];

      const lowerText = text.toLowerCase();

      if (keywordsHigh.some(k => lowerText.includes(k))) return "High";
      if (keywordsMedium.some(k => lowerText.includes(k))) return "Medium";
      if (keywordsLow.some(k => lowerText.includes(k))) return "Low";

      // AI fallback
      const prompt = `
You are a disaster emergency AI.
Correct spelling mistakes.
Classify SOS into High, Medium, or Low.

SOS: "${text}"
Reply ONLY one word: High, Medium, Low
`;

      const res = await fetch("http://localhost:3000/ask-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt })
      });

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.[0]?.text?.trim() || "";

      if (rawText.toLowerCase().includes("high")) return "High";
      if (rawText.toLowerCase().includes("low")) return "Low";
      return "Medium";

    } catch (err) {
      console.error("AI ERROR:", err);
      return "Medium"; // fallback
    }
  }

  // ================== AI PREVIEW ==================
  needInput.addEventListener("input", async () => {
    const text = needInput.value.trim();
    if (!text) return aiPreview.innerText = "";
    const priority = await categorizeSOS(text);
    aiPreview.innerText = `Predicted priority: ${priority}`;
  });

  // ================== SEND SOS ==================
  window.sendSOS = async function() {
    const name = nameInput.value.trim();
    const need = needInput.value.trim();
    if (!name || !need) return alert("Please enter name and help needed.");

    const snapshot = await db.collection("sos").where("name", "==", name).get();
    if (!snapshot.empty) return alert("🚨 Your SOS is already active!");

    navigator.geolocation.getCurrentPosition(async pos => {
      const priority = await categorizeSOS(need);
      await db.collection("sos").add({
        name,
        need,
        priority,
        location: new firebase.firestore.GeoPoint(pos.coords.latitude, pos.coords.longitude),
        time: new Date()
      });
      alert(`✅ SOS Sent with priority: ${priority}`);
      nameInput.value = "";
      needInput.value = "";
      aiPreview.innerText = "";
    });
  }

  // ================== LOGIN ==================
  window.login = function() {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
      .then(() => initDashboard())
      .catch(err => alert(err.message));
  }

  // ================== DASHBOARD ==================
  function initDashboard() {
    mainView.style.display = "none";
    dashboardView.style.display = "block";

    window.initMap(); // render map

    db.collection("sos").orderBy("time", "desc").onSnapshot(snapshot => {
      alerts.innerHTML = "";
      clearMarkers();

      snapshot.forEach(doc => {
        const d = doc.data();
        alerts.innerHTML += `
          <div class="alert">
            <span><b>${d.name}</b> : ${d.need}
              <span class="priority">${d.priority}</span>
            </span>
            <span class="delete-btn" onclick="deleteSOS('${doc.id}')">❌</span>
          </div>
        `;
        if (d.location) addMarker(d.location.latitude, d.location.longitude, d.name, d.priority);
      });

      if (markers.length) google.maps.event.addListenerOnce(map, 'idle', () => map.fitBounds(bounds));
    });
  }

  // ================== AUTO LOAD DASHBOARD ==================
  if (isDashboard) initDashboard();

  // ================== DELETE SOS ==================
  window.deleteSOS = function(id) {
    if (confirm("Mark rescue as completed?"))
      db.collection("sos").doc(id).delete();
  }

});
