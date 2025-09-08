import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { authAPI } from '../services/api';
import Swal from 'sweetalert2';

const PasswordChangeModal = ({ show, onHide }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      Swal.fire({ title: 'Mismatch', text: 'New passwords do not match', icon: 'warning', timer: 3000, showConfirmButton: true });
      return;
    }
    try {
      setLoading(true);
      await authAPI.updatePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      Swal.fire({ title: 'Success', text: 'Password updated successfully', icon: 'success', timer: 2500, showConfirmButton: false });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onHide();
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message || 'Failed to update password', icon: 'error', timer: 4000, showConfirmButton: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={!!show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="currentPassword">
            <Form.Label>Current Password</Form.Label>
            <Form.Control name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="newPassword">
            <Form.Label>New Password</Form.Label>
            <Form.Control name="newPassword" type="password" value={form.newPassword} onChange={handleChange} minLength={6} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="confirmPassword">
            <Form.Label>Confirm New Password</Form.Label>
            <Form.Control name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Updating...</> : 'Update Password'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PasswordChangeModal;
