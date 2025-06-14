import { useEffect } from "react";

const TestPage = () => {
    useEffect(() => {
        // This effect runs once when the component mounts
        console.log("TestPage component mounted");
        const userSubmission = fetch("http://localhost:3000/api/problems/p1-sum-two-nums/submissions/history", {
            headers: {
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZjNhNDdkNy1jNzEzLTQ1ZGMtOTc1My03ZDgxNGJmMDAxZmUiLCJpYXQiOjE3NDk5MDA2NzAsImV4cCI6MTc1MDUwNTQ3MH0.xSxHA7wkwXBUZI2oY9M4kGivvKIHgpiNtS-69zlj_dI`
            }
        });
        const data = userSubmission.then(res => res.json());
        data.then(data => {
            console.log("User submission data:", data);
        });
        // You can add any initialization logic here
        return () => {
            // This cleanup function runs when the component unmounts
            console.log("TestPage component unmounted");
        };
    }, []);

  return (
    <>
    <div>
        <h1 className="text-2xl font-bold mb-4">Test Page</h1>
        <p>This is a placeholder for the test page.</p>
        <p>You can add your test components or logic here.</p>
        <p>Feel free to customize this page as needed.</p>
    </div>
    </>
  )
}

export default TestPage
