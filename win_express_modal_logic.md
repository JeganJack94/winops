# Win Express Ops - Modal Logic (Add Rider)

## Overview

This document explains how to implement a reusable modal in React to add
a rider with fields: Name and Phone.

------------------------------------------------------------------------

## 1. State Management

``` js
const [isOpen, setIsOpen] = useState(false);
const [name, setName] = useState("");
const [phone, setPhone] = useState("");
```

------------------------------------------------------------------------

## 2. Open Modal Button

``` jsx
<button
  onClick={() => setIsOpen(true)}
  className="bg-orange-500 text-white px-4 py-2 rounded-lg"
>
  + Add Rider
</button>
```

------------------------------------------------------------------------

## 3. Modal UI

``` jsx
{isOpen && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    onClick={() => setIsOpen(false)}
  >
    <div
      className="bg-white w-[90%] max-w-md p-5 rounded-2xl shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-semibold mb-4">Add Rider</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
          required
        />

        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

------------------------------------------------------------------------

## 4. Submit Logic

``` js
const handleSubmit = async (e) => {
  e.preventDefault();

  const newRider = {
    name,
    phone,
    createdAt: new Date()
  };

  try {
    // Example Firestore save
    // await addDoc(collection(db, "riders"), newRider);

    console.log("Saved:", newRider);

    setName("");
    setPhone("");
    setIsOpen(false);

  } catch (error) {
    console.error("Error adding rider:", error);
  }
};
```

------------------------------------------------------------------------

## 5. Close Modal on ESC

``` js
useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === "Escape") setIsOpen(false);
  };

  window.addEventListener("keydown", handleEsc);
  return () => window.removeEventListener("keydown", handleEsc);
}, []);
```

------------------------------------------------------------------------

## 6. Best Practice (Reusable Modal)

``` jsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <AddRiderForm />
</Modal>
```

------------------------------------------------------------------------

## Summary

-   Use state to control modal visibility
-   Prevent background click propagation
-   Reset form after submit
-   Close modal on submit, cancel, outside click, and ESC key
