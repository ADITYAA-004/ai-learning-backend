;(async()=>{
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const base = 'http://localhost:5000';
  const instructor = {
    name: 'E2E Instructor',
    email: 'e2e_instructor_day3@example.com',
    password: 'Password123',
    role: 'instructor',
  };

  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
  try{
    console.log('== Registering instructor (if not exists) ==');
    try{
      const r = await fetch(base + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instructor),
      });
      const txt = await r.text();
      try{ console.log('REGISTER', r.status, JSON.parse(txt)); } catch(e){ console.log('REGISTER', r.status, txt); }
    }catch(regErr){ console.log('Register attempt failed (may already exist):', regErr.message || regErr); }

    console.log('\n== Logging in ==');
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: instructor.email, password: instructor.password }),
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN', loginRes.status, loginJson);
    if(!loginJson.token){ console.error('No token returned; aborting.'); process.exit(1); }
    const token = loginJson.token;

    await sleep(300);
    console.log('\n== Create Course ==');
    const createRes = await fetch(base + '/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ title: 'E2E Test Course', description: 'Created by E2E script', pdfUrl: '', videoUrl: '', thumbnail: '' }),
    });
    const createJson = await createRes.json();
    console.log('CREATE', createRes.status, createJson);
    const courseId = createJson.course ? (createJson.course._id || createJson.course.id) : null;

    await sleep(300);
    console.log('\n== Get All Courses ==');
    const allRes = await fetch(base + '/api/courses', { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
    const allJson = await allRes.json();
    console.log('ALL', allRes.status, Array.isArray(allJson.courses)?('count='+allJson.courses.length):allJson);

    await sleep(300);
    console.log('\n== Get My Courses ==');
    const myRes = await fetch(base + '/api/courses/my-courses', { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
    const myJson = await myRes.json();
    console.log('MY', myRes.status, myJson.count!==undefined?('count='+myJson.count):myJson);

    if(courseId){
      await sleep(300);
      console.log('\n== Get Course By ID ==');
      const oneRes = await fetch(base + `/api/courses/${courseId}`, { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
      const oneJson = await oneRes.json();
      console.log('GETBYID', oneRes.status, oneJson);

      console.log('\n== Update Course ==');
      const updRes = await fetch(base + `/api/courses/${courseId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ title: 'E2E Test Course - Updated', description: 'Updated by E2E script' }) });
      const updJson = await updRes.json();
      console.log('UPDATE', updRes.status, updJson);

      console.log('\n== Delete Course ==');
      const delRes = await fetch(base + `/api/courses/${courseId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
      const delJson = await delRes.json();
      console.log('DELETE', delRes.status, delJson);
    } else {
      console.log('No courseId from create — skipping get/update/delete');
    }

    console.log('\nE2E script finished');
    process.exit(0);
  }catch(err){ console.error('E2E error', err); process.exit(1); }
})();
