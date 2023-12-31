var firestore = firebase.firestore();
var auth = firebase.auth();
const storageRef = firebase.storage().ref(); // Initialize Firebase Storage
const currentPage = window.location.pathname.split('/').pop();

// Remove the 'active' class from all navigation links
document.querySelectorAll('.nav-link').forEach(link => {
  link.classList.remove('active');
});

// Highlight the active tab based on the current page
document.querySelectorAll('.nav-link').forEach(link => {
  const linkPage = link.getAttribute('href');
  if (linkPage === currentPage) {
    link.classList.add('active');
  }
});
async function loadInfo() {
  auth.onAuthStateChanged(function(user) {
    if (!user) {
      // If the user is not logged in, display a message
      var profileBody = document.getElementById("profile-body");
      profileBody.innerHTML = '<p>Login or register to see profile information.</p>';
    }
  });
  auth.onAuthStateChanged(function(user) {
    if (user) {
      var userID = user.uid;
      var volunteerHistoryTable = document.getElementById('volunteerHistoryTable');
      var volunteerHistoryRef = firestore.collection('users').doc(userID).collection('volunteerHistory');

      // Clear the existing table data
      volunteerHistoryTable.querySelector('tbody').innerHTML = '';

      // Fetch the user's volunteer history
      volunteerHistoryRef.get()
        .then(function (querySnapshot) {
          var volunteerHistory = [];
          querySnapshot.forEach(function (doc) {
            var data = doc.data();
            volunteerHistory.push(data);
          
            // Create a new row for each volunteer activity and append it to the table
            var newRow = volunteerHistoryTable.querySelector('tbody').insertRow();
            newRow.insertCell(0).textContent = data.organization;
            newRow.insertCell(1).textContent = data.activity;
            newRow.insertCell(2).textContent = data.hours;
            newRow.insertCell(3).textContent = data.date;
          
            // Add a settings button and dropdown menu to each row
            var settingsCell = newRow.insertCell(4);
            settingsCell.className = 'settings-cell';

            var editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = function () {
              openEditActivityForm(doc.id, data); // Pass the document ID and activity data to the edit form
            };

            var deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = function () {
              confirmDeleteActivity(doc.id); // Pass the document ID to identify the activity
            };

            settingsCell.appendChild(editButton);
            settingsCell.appendChild(deleteButton);

            // Create a dropdown menu for each row
            var dropdownMenu = document.createElement('div');
            dropdownMenu.className = 'dropdown-menu';
            dropdownMenu.id = 'dropdown_' + doc.id; // Use the document ID to uniquely identify each dropdown
            dropdownMenu.innerHTML = '<button onclick="editActivity(\'' + doc.id + '\')">Edit</button>' +
              '<button onclick="confirmDeleteActivity(\'' + doc.id + '\')">Delete</button>';
            settingsCell.appendChild(dropdownMenu);
            
          });
          var totalHours = calculateTotalVolunteerHours(volunteerHistory);
          updateVolunteerHours(totalHours);
        })
        .catch(function (error) {
          console.error('Error fetching volunteer history:', error);
        });
          // User is signed in, retrieve user's name
          firestore.collection('users').doc(user.uid).get()
              .then(function(doc) {
                  if (doc.exists) {
                      var userData = doc.data();
                      var userName = userData.name;
                      var userLocation = userData.location;
                      var userHours = userData.hours;
                      var userInterests = userData.interests;
                      // Update the user's name in the profile
                      document.getElementById('user-name').textContent = userName;
                      document.getElementById('user-location').textContent = userLocation;
                      document.getElementById('user-interests').textContent = userInterests.join(', ');
                      document.getElementById('user-hours').textContent = userHours;

                  } else {
                      console.log('User data not found');
                  }
              })
              .catch(function(error) {
                  console.log('Error getting user data:', error);
              });
      } else {
          // User is not signed in, handle this case if needed
      }
  });
}
loadInfo();

// Function to handle sign-out confirmation
function handleSignOutConfirmation() {
  console.log("signout");
  const confirmationMessage = document.getElementById('signOutButton').getAttribute('data-confirm');
  if (confirm(confirmationMessage)) {
    // User clicked "OK," sign them out
    signOut();
  }
}

// Function to sign out the user and redirect to the index page
function signOut() {
  firebase.auth().signOut().then(() => {
    // Sign-out successful, redirect to the index page
    window.location.href = 'index.html';
  }).catch((error) => {
    // An error occurred while signing out
    console.error('Sign-out error:', error);
  });
}

// Add an event listener to the sign-out button
document.getElementById('signOutButton').addEventListener('click', handleSignOutConfirmation);


const profileEditForm = document.getElementById('profileEditForm');


function openForm(formId) {
  document.getElementById(formId).style.display = "block";
}

// Function to close the popup form
function closeForm(formId) {
  document.getElementById(formId).style.display = "none";
}

function submitProfileChanges() {
  var user = firebase.auth().currentUser;
  if (user) {
    const newName = document.getElementById('newName').value;
    const newUsername = document.getElementById('newUsername').value;
    const newEmail = document.getElementById('newEmail').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Updated for location and interests
    const locationOptions = document.getElementsByName('location');
    const selectedLocation = Array.from(locationOptions).find(option => option.checked);
    const newLocation = selectedLocation ? selectedLocation.value : '';

    const interestOptions = document.getElementsByName('interest');
    const selectedInterests = Array.from(interestOptions)
      .filter(option => option.checked)
      .map(option => option.value === 'LGBTQ+' ? option.value : option.value.toLowerCase());

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }

    // Create an object to store the fields to update
    const fieldsToUpdate = {};

    if (newName) {
      fieldsToUpdate.name = newName;
    }

    if (newUsername) {
      fieldsToUpdate.username = newUsername;
    }

    if (newEmail) {
      fieldsToUpdate.email = newEmail;
    }

    // Update the fieldsToUpdate object
    if (newLocation) {
      fieldsToUpdate.location = newLocation;
    }

    if (selectedInterests.length > 0) {
      fieldsToUpdate.interests = selectedInterests;
    }

    // Only update the user's information in Firestore if there are fields to update
    if (Object.keys(fieldsToUpdate).length > 0) {
      const userRef = firestore.collection('users').doc(user.uid);
      userRef.update(fieldsToUpdate)
        .then(() => {
          // Close the modal and update the displayed information on the page
          closeForm('editProfileForm');

          if (fieldsToUpdate.name) {
            document.getElementById('user-name').textContent = fieldsToUpdate.name;
          }

          if (fieldsToUpdate.location) {
            document.getElementById('user-location').textContent = fieldsToUpdate.location;
          }

          if (fieldsToUpdate.interests) {
            document.getElementById('user-interests').textContent = fieldsToUpdate.interests.join(', ');
          }
        })
        .catch((error) => {
          console.error('Error updating user information:', error);
        });
    } else {
      alert('No fields to update. Please enter information in at least one field.');
    }
  }
}

// Function to add a new volunteer activity to Firestore
function addVolunteerActivityToFirestore(activityData) {
  const user = firebase.auth().currentUser;
  if (user) {
      const userId = user.uid;
      const volunteerHistoryRef = firestore.collection('users').doc(userId).collection('volunteerHistory');

      // Add a new document with a unique ID and the provided activity data
      volunteerHistoryRef.add(activityData)
          .then(() => {
              updateTotalVolunteerHours(userId, activityData.hours);

              // Successfully added the activity, you can update the table here
              console.log('Volunteer activity added to Firestore');
              loadInfo();
          })
          .catch((error) => {
              console.error('Error adding volunteer activity:', error);
          });
  }
}
function updateTotalVolunteerHours(userId, newHours) {
  const userRef = firestore.collection('users').doc(userId);
  userRef.get()
    .then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        const currentTotalHours = userData.hours || 0;
        const updatedTotalHours = currentTotalHours + newHours;

        // Update the total hours in the user document
        userRef.update({ hours: updatedTotalHours })
          .then(() => {
            console.log('Total volunteer hours updated in Firestore');
          })
          .catch((error) => {
            console.error('Error updating total volunteer hours:', error);
          });
      }
    })
    .catch((error) => {
      console.error('Error getting user document:', error);
    });
}

// Function to open the volunteer activity form popup
function openVolunteerActivityForm() {
  const form = document.getElementById('volunteerActivityForm');
  form.style.display = 'block';
}

// Function to close the volunteer activity form popup
function closeVolunteerActivityForm() {
  const form = document.getElementById('volunteerActivityForm');
  form.style.display = 'none';
}

// Event listener for the "Add Volunteer Activity" button
document.getElementById('addVolunteerActivityButton').addEventListener('click', () => {
  openVolunteerActivityForm();
});

// Event listener for the submit button in the volunteer activity form
document.getElementById('submitVolunteerActivityButton').addEventListener('click', () => {
  const organization = document.getElementById('volunteerOrganization').value;
  const activity = document.getElementById('volunteerActivity').value;
  const hours = document.getElementById('volunteerHours').value;
  const date = document.getElementById('volunteerDate').value;

  // Validate the input fields
  if (!organization || !activity || !hours || !date) {
      alert('Please fill in all fields');
      return;
  }

  const activityData = {
      organization: organization,
      activity: activity,
      hours: parseFloat(hours),
      date: date,
  };
  addVolunteerActivityToFirestore(activityData);
  closeVolunteerActivityForm();
});

// Event listener for the close button in the volunteer activity form
document.getElementById('closeVolunteerActivityForm').addEventListener('click', () => {
  closeVolunteerActivityForm();
});


function calculateTotalVolunteerHours(volunteerHistory) {
  let totalHours = 0;
  volunteerHistory.forEach((activity) => {
    totalHours += activity.hours;
  });
  return totalHours;
}

function chooseAndUploadProfilePicture() {
  const fileInput = document.getElementById('profile-picture-upload');
  fileInput.click(); // Trigger the file input click event

  // Add an event listener to the file input to handle the selected file
  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];

    if (file) {
      const user = firebase.auth().currentUser;
      const storageRef = firebase.storage().ref();

      // Create a reference for the user's profile picture in Firebase Storage
      const profilePictureRef = storageRef.child(`profile_pictures/${user.uid}/${file.name}`);

      // Upload the selected file to Firebase Storage
      profilePictureRef.put(file).then(function (snapshot) {
        console.log('Profile picture uploaded!');

        // Get the download URL of the uploaded profile picture
        snapshot.ref.getDownloadURL().then(function (downloadURL) {
          // Save the URL to the user's document in Firestore
          const db = firebase.firestore();
          const userRef = db.collection('users').doc(user.uid);

          // Update the user's document with the profile picture URL and file name
          userRef.update({
            profilePictureURL: downloadURL,
            profilePictureFileName: file.name
          }).then(function() {
            console.log('User document updated with profile picture info.');
          }).catch(function(error) {
            console.error('Error updating user document:', error);
          });

          // Display the profile picture on the page
          const profilePictureElement = document.getElementById('profile-picture');
          profilePictureElement.src = downloadURL;
        }).catch(function (error) {
          console.error('Error getting download URL:', error);
        });
      }).catch(function (error) {
        console.error('Profile picture upload failed:', error);
      });
    }
  });
}

function loadUserProfilePicture() {
  auth.onAuthStateChanged(function (user) {
    if (user) {
      firestore.collection('users').doc(user.uid).get()
        .then(function (doc) {
          if (doc.exists) {
            var userData = doc.data();
            var profilePictureRef = firebase.storage().ref().child(`profile_pictures/${user.uid}/${userData.profilePictureFileName}`);

            // Get the download URL of the user's profile picture
            profilePictureRef.getDownloadURL()
              .then(function (url) {
                // Display the user's profile picture or the default picture
                var profilePictureElement = document.getElementById('profile-picture');
                profilePictureElement.src = url;
              })
              .catch(function (error) {
                // If there's an error, display the default picture
                var defaultPictureURL = 'https://firebasestorage.googleapis.com/v0/b/forge-change.appspot.com/o/profile_pictures%2Fdefault_profile_pic.jpeg?alt=media&token=b7c61187-8831-458f-a220-a319de08e22d&_gl=1*1ebxgrs*_ga*MTYwMjkwNTkxOS4xNjk2NTQwNDM2*_ga_CW55HF8NVT*MTY5ODk5NjA5MC4xLjIyLjAuMTY5ODk5NjA5MC4w';
                var profilePictureElement = document.getElementById('profile-picture');
                profilePictureElement.src = defaultPictureURL;
              });
          } else {
            console.log('User data not found');
          }
        })
        .catch(function (error) {
          console.log('Error getting user data:', error);
        });
    }
  });
}

// Call the function to load the user's profile picture
loadUserProfilePicture();


function handleDeleteAccountConfirmation() {
  const confirmationMessage = "Are you sure you want to delete your account? This action cannot be undone.";
  if (confirm(confirmationMessage)) {
    // User clicked "OK," delete their account
    deleteAccount();
  }
}

function deleteAccount() {
  const user = firebase.auth().currentUser;

  if (user) {
    // Delete the user's document from Firestore
    firestore.collection('users').doc(user.uid).delete()
      .then(() => {
        console.log('User document deleted from Firestore.');
      })
      .catch((error) => {
        console.error('Error deleting user document from Firestore:', error);
      });

    // Delete the user's account
    user.delete()
      .then(() => {
        console.log('User account deleted.');
        // Redirect the user to the sign-in or home page
        window.location.href = 'index.html'; // Change the URL as needed
      })
      .catch((error) => {
        console.error('Error deleting user account:', error);
      });
  }
}

// Add these functions after the existing JavaScript code

// Show the dropdown menu for a specific row
function showSettingsDropdown(documentId) {
  var dropdownMenu = document.getElementById('dropdown_' + documentId);
  closeAllDropdowns(); // Close any open dropdowns
  dropdownMenu.style.display = 'block';
}

// Close all open dropdowns
function closeAllDropdowns() {
  var dropdowns = document.querySelectorAll('.dropdown-menu');
  dropdowns.forEach(function (dropdown) {
    dropdown.style.display = 'none';
  });
}

// Edit the selected volunteer activity
function editActivity(documentId) {
  closeAllDropdowns();

  // Retrieve the activity data from Firestore
  var user = firebase.auth().currentUser;
  if (user) {
    var userID = user.uid;
    var volunteerHistoryRef = firestore.collection('users').doc(userID).collection('volunteerHistory').doc(documentId);

    volunteerHistoryRef.get()
      .then(function (doc) {
        if (doc.exists) {
          var activityData = doc.data();
          // Open the edit activity form with the existing data
          openEditActivityForm(documentId, activityData);
        } else {
          console.log('Volunteer activity not found');
        }
      })
      .catch(function (error) {
        console.error('Error fetching volunteer activity:', error);
      });
  }
}

// Open the edit activity form with pre-filled data
function openEditActivityForm(documentId, activityData) {
  // Populate the form fields with the existing data
  document.getElementById('editVolunteerOrganization').value = activityData.organization;
  document.getElementById('editVolunteerActivity').value = activityData.activity;
  document.getElementById('editVolunteerHours').value = activityData.hours;
  document.getElementById('editVolunteerDate').value = activityData.date;

  // Show the edit activity form
  openForm('editVolunteerActivityForm');

  // Add an event listener to the submit button in the edit activity form
  document.getElementById('submitEditVolunteerActivityButton').addEventListener('click', function () {
    // Update the volunteer activity in Firestore and reload the table
    updateVolunteerActivity(documentId);
    closeForm('editVolunteerActivityForm');
  });
}

function updateVolunteerHours(hours) {
  document.getElementById('user-hours').textContent = hours;
}

// Update the volunteer activity in Firestore
function updateVolunteerActivity(documentId) {
  var user = firebase.auth().currentUser;
  if (user) {
    var userID = user.uid;
    var volunteerHistoryRef = firestore.collection('users').doc(userID).collection('volunteerHistory').doc(documentId);

    // Get the existing data from Firestore
    volunteerHistoryRef.get()
      .then(function (doc) {
        if (doc.exists) {
          var oldData = doc.data();
          var updatedData = {
            organization: document.getElementById('editVolunteerOrganization').value,
            activity: document.getElementById('editVolunteerActivity').value,
            hours: parseFloat(document.getElementById('editVolunteerHours').value),
            date: document.getElementById('editVolunteerDate').value,
          };

          // Calculate the difference in hours
          var hoursDifference = updatedData.hours - oldData.hours;

          // Update the volunteer activity in Firestore
          volunteerHistoryRef.update(updatedData)
            .then(function () {
              console.log('Volunteer activity updated in Firestore');
              updateTotalVolunteerHours(userID, hoursDifference);
              loadInfo(); // Reload the volunteer history table
            })
            .catch(function (error) {
              console.error('Error updating volunteer activity:', error);
            });
        } else {
          console.log('Volunteer activity not found');
        }
      })
      .catch(function (error) {
        console.error('Error fetching volunteer activity:', error);
      });
  }
}

// Confirm the deletion of the selected volunteer activity
function confirmDeleteActivity(documentId) {
  closeAllDropdowns();
  var confirmation = window.confirm('Are you sure you want to delete this volunteer activity?');
  if (confirmation) {
    deleteVolunteerActivity(documentId);
  }
}

// Delete the volunteer activity from Firestore
// Delete the volunteer activity from Firestore
function deleteVolunteerActivity(documentId) {
  var user = firebase.auth().currentUser;
  if (user) {
    var userID = user.uid;
    var volunteerHistoryRef = firestore.collection('users').doc(userID).collection('volunteerHistory').doc(documentId);

    // Fetch the hours of the activity to be deleted
    volunteerHistoryRef.get()
      .then(function (doc) {
        if (doc.exists) {
          var activityData = doc.data();
          var hoursToDelete = activityData.hours;

          // Delete the volunteer activity from Firestore
          volunteerHistoryRef.delete()
            .then(function () {
              console.log('Volunteer activity deleted from Firestore');

              // Fetch the current total volunteer hours from the user document
              firestore.collection('users').doc(userID).get()
                .then(function (userDoc) {
                  if (userDoc.exists) {
                    var userData = userDoc.data();
                    var currentTotalHours = userData.hours;

                    // Calculate the updated total volunteer hours
                    var updatedTotalHours = currentTotalHours - hoursToDelete;

                    // Update the total volunteer hours in the user document
                    firestore.collection('users').doc(userID).update({
                      hours: updatedTotalHours
                    })
                      .then(function () {
                        console.log('Total volunteer hours updated in Firestore');
                        
                        // Fetch the updated volunteer history to display on the page
                        firestore.collection('users').doc(userID).collection('volunteerHistory').get()
                          .then(function (querySnapshot) {
                            var volunteerHistory = [];
                            querySnapshot.forEach(function (doc) {
                              var data = doc.data();
                              volunteerHistory.push(data);
                            });

                            // Update the displayed volunteer hours on the page
                            var totalHours = calculateTotalVolunteerHours(volunteerHistory);
                            updateVolunteerHours(totalHours);
                            loadInfo();
                          })
                          .catch(function (error) {
                            console.error('Error fetching updated volunteer history:', error);
                          });
                      })
                      .catch(function (error) {
                        console.error('Error updating total volunteer hours in Firestore:', error);
                      });
                  } else {
                    console.log('User document not found');
                  }
                })
                .catch(function (error) {
                  console.error('Error fetching user document:', error);
                });
            })
            .catch(function (error) {
              console.error('Error deleting volunteer activity:', error);
            });
        } else {
          console.log('Volunteer activity not found');
        }
      })
      .catch(function (error) {
        console.error('Error fetching volunteer activity:', error);
      });
  }
}

function exportVolunteerInfo() {
    // Get the volunteer history table
  var volunteerHistoryTable = document.getElementById('volunteerHistoryTable');

  // Create a new Workbook
  var wb = XLSX.utils.book_new();

  // Extract the headers and data from the first 4 columns
  var headers = Array.from(volunteerHistoryTable.querySelectorAll('thead th')).slice(0, 4).map(th => th.textContent.trim());
  var dataRows = Array.from(volunteerHistoryTable.querySelectorAll('tbody tr')).map(row =>
    Array.from(row.querySelectorAll('td')).slice(0, 4).map(td => td.textContent.trim())
  );

  // Create a new worksheet
  var ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Volunteer History');

  // Save the workbook as an Excel file
  var fileName = 'VolunteerHistory.xlsx';
  XLSX.writeFile(wb, fileName);
}